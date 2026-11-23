import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import type { AdjustmentForm } from '@/types'

export const adjustmentSchema = z.object({
  value: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number().refine((value) => value !== 0, { params: { i18n: 'adjustment-not-zero' } }),
  ),
  name: z.string().min(1).max(150),
})

export const adjustmentFormSchema = toTypedSchema(adjustmentSchema)

export type AdjustmentFormValues = { value: number; name: string }

export function toAdjustmentForm(values: AdjustmentFormValues): AdjustmentForm {
  return { value: values.value, name: values.name }
}
