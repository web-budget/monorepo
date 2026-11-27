import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import { blankToNull, optionalNumberSchema, optionalTextSchema } from '@/schemas/fields'
import type {
  CompartmentCreateForm,
  CompartmentType,
  CompartmentUpdateForm,
  CompartmentView,
} from '@/types'

export const COMPARTMENT_TYPES = ['RESERVE', 'INVESTMENT', 'GOAL'] as const

export const compartmentSchema = z.object({
  name: z.string().min(1).max(150),
  type: z.enum(COMPARTMENT_TYPES),
  description: optionalTextSchema(150),
  targetValue: optionalNumberSchema(z.number().positive()),
  targetDate: z.string().nullish(),
})

export const compartmentFormSchema = toTypedSchema(compartmentSchema)

export type CompartmentFormValues = z.infer<typeof compartmentSchema>

export function isGoal(type: CompartmentType | undefined): boolean {
  return type === 'GOAL'
}

function goalData(values: CompartmentFormValues) {
  const goal = isGoal(values.type)
  return {
    description: goal ? blankToNull(values.description) : null,
    targetValue: goal ? (values.targetValue ?? null) : null,
    targetDate: goal ? blankToNull(values.targetDate) : null,
  }
}

export function toCompartmentCreateForm(values: CompartmentFormValues): CompartmentCreateForm {
  return { name: values.name.trim(), type: values.type, ...goalData(values) }
}

export function toCompartmentUpdateForm(values: CompartmentFormValues): CompartmentUpdateForm {
  return { name: values.name.trim(), ...goalData(values) }
}

export function toCompartmentFormValues(compartment: CompartmentView): CompartmentFormValues {
  return {
    name: compartment.name,
    type: compartment.type,
    description: compartment.description ?? '',
    targetValue: compartment.targetValue ?? null,
    targetDate: compartment.targetDate ?? '',
  }
}
