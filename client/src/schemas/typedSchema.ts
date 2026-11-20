import { z } from 'zod'
import type { TypedSchema, TypedSchemaError } from 'vee-validate'

/**
 * vee-validate 4.x does not understand Standard Schema (only 5.x does) and the official
 * `@vee-validate/zod` adapter is capped at Zod 3, so this is a minimal port of that adapter to Zod 4.
 */
type DeepPartial<T> = T extends readonly (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T

type PlainObject = Record<string, unknown>

function isPlainObject(value: unknown): value is PlainObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function merge(target: PlainObject, source: PlainObject): PlainObject {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key]
    target[key] =
      isPlainObject(value) && isPlainObject(current) ? merge(current, value) : (value as unknown)
  }
  return target
}

// vee-validate paths use brackets for indexes (`roles[0]`), Zod issue paths are plain segments.
function toFormPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((result, segment, index) => {
    if (typeof segment === 'number') return `${result}[${segment}]`
    return index === 0 ? String(segment) : `${result}.${String(segment)}`
  }, '')
}

function collectErrors(issues: readonly z.core.$ZodIssue[], errors: Map<string, TypedSchemaError>) {
  for (const issue of issues) {
    const path = toFormPath(issue.path)
    if (issue.code === 'invalid_union') {
      // Zod 4 reports the member issues with paths relative to the union.
      const members = issue.errors.flat().map((member) => ({
        ...member,
        path: [...issue.path, ...member.path],
      }))
      collectErrors(members, errors)
      if (!path) continue
    }
    const entry = errors.get(path) ?? { path, errors: [] }
    entry.errors.push(issue.message)
    errors.set(path, entry)
  }
}

// Zod has no way to read a schema's defaults, so cast() collects them from the object shape.
function getDefaults(schema: z.ZodType): PlainObject | undefined {
  if (!(schema instanceof z.ZodObject)) return undefined
  return Object.fromEntries(
    Object.entries(schema.shape as Record<string, z.ZodType>).map(([key, value]) => {
      if (value instanceof z.ZodDefault) return [key, value.def.defaultValue]
      if (value instanceof z.ZodObject) return [key, getDefaults(value)]
      return [key, undefined]
    }),
  )
}

function schemaForPath(schema: z.ZodType, path: string): z.ZodType | undefined {
  const segments = path.split(/\.|\[(\d+)\]/).filter(Boolean)
  let current: z.ZodType | undefined = schema
  for (const segment of segments) {
    if (current instanceof z.ZodObject) {
      current = (current.shape as Record<string, z.ZodType>)[segment]
    } else if (current instanceof z.ZodArray && /^\d+$/.test(segment)) {
      current = current.element as z.ZodType
    } else {
      return undefined
    }
  }
  return current
}

export function toTypedSchema<TSchema extends z.ZodType>(
  schema: TSchema,
): TypedSchema<DeepPartial<z.input<TSchema>>, z.output<TSchema>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema.safeParseAsync(values)
      if (result.success) return { value: result.data, errors: [] }

      const errors = new Map<string, TypedSchemaError>()
      collectErrors(result.error.issues, errors)
      return { errors: [...errors.values()] }
    },
    cast(values) {
      const parsed = schema.safeParse(values)
      if (parsed.success) return parsed.data as DeepPartial<z.input<TSchema>>

      // No "casting" in Zod: the next best thing is the schema defaults merged with the given values.
      const defaults = getDefaults(schema)
      if (defaults && isPlainObject(values)) return merge(defaults, values) as never
      return values as DeepPartial<z.input<TSchema>>
    },
    describe(path) {
      const target = path ? schemaForPath(schema, path) : schema
      return target
        ? { required: !target.isOptional(), exists: true }
        : { required: false, exists: false }
    },
  }
}
