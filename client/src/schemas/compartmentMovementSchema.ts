import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import { blankToNull, optionalTextSchema } from '@/schemas/fields'
import type { CompartmentMovementForm } from '@/types'

export const compartmentMovementSchema = z.object({
  direction: z.enum(['DEPOSIT', 'WITHDRAWAL']),
  compartment: z.string().min(1),
  value: z.number().positive(),
  note: optionalTextSchema(150),
})

export const compartmentMovementFormSchema = toTypedSchema(compartmentMovementSchema)

export type CompartmentMovementFormValues = z.infer<typeof compartmentMovementSchema>

export function toCompartmentMovementForm(
  values: CompartmentMovementFormValues,
): CompartmentMovementForm {
  return {
    direction: values.direction,
    value: values.value,
    note: blankToNull(values.note),
  }
}
