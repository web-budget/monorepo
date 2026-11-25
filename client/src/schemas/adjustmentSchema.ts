import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import type { AdjustmentForm } from '@/types'

export const adjustmentSchema = z.object({
  value: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : Number(value)),
    z.number().refine((value) => value !== 0, { params: { i18n: 'adjustment-not-zero' } }),
  ),
})

export const adjustmentFormSchema = toTypedSchema(adjustmentSchema)

export type AdjustmentFormValues = { value: number }

export function toAdjustmentForm(values: AdjustmentFormValues): AdjustmentForm {
  return { value: values.value }
}
