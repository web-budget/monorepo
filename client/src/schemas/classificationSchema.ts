import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import { blankToNull, optionalNumberSchema } from '@/schemas/fields'
import type {
  ClassificationCreateForm,
  ClassificationUpdateForm,
  ClassificationView,
} from '@/types'

export const CLASSIFICATION_TYPES = ['INCOME', 'EXPENSE'] as const

export const classificationSchema = z.object({
  active: z.boolean(),
  name: z.string().min(3).max(150),
  type: z.enum(CLASSIFICATION_TYPES),
  budget: optionalNumberSchema(),
  description: z.string().nullish(),
})

export const classificationFormSchema = toTypedSchema(classificationSchema)

export type ClassificationFormValues = z.infer<typeof classificationSchema>

export const classificationFormDefaults = { active: true }

export function toClassificationCreateForm(
  values: ClassificationFormValues,
): ClassificationCreateForm {
  return {
    name: values.name,
    type: values.type,
    budget: values.budget,
    description: blankToNull(values.description),
  }
}

export function toClassificationUpdateForm(
  values: ClassificationFormValues,
): ClassificationUpdateForm {
  return {
    name: values.name,
    active: values.active,
    budget: values.budget,
    description: blankToNull(values.description),
  }
}

export function toClassificationFormValues(
  classification: ClassificationView,
): Partial<ClassificationFormValues> {
  return {
    active: classification.active,
    name: classification.name,
    type: classification.type,
    budget: classification.budget,
    description: classification.description,
  }
}
