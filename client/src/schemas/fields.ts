import { z } from 'zod'

export interface SelectedOption {
  id: string
  label: string
}

export const selectedOptionSchema = z.object({ id: z.string(), label: z.string() }).nullish()

export const optionalTextSchema = (maximum: number) => z.string().max(maximum).nullish()

export const optionalNumberSchema = (numberSchema: z.ZodNumber = z.number()) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    numberSchema.nullable(),
  )

export function blankToNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value.trim() === '' ? null : value
}

export function optionId(option: SelectedOption | null | undefined): string | null {
  return option ? option.id : null
}
