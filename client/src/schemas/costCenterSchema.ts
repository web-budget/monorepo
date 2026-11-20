import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import { blankToNull, optionalNumberSchema, optionId, selectedOptionSchema } from '@/schemas/fields'
import type { CostCenterCreateForm, CostCenterUpdateForm, CostCenterView } from '@/types'

export const costCenterSchema = z.object({
  active: z.boolean(),
  name: z.string().min(3).max(150),
  parentCostCenter: selectedOptionSchema,
  incomeBudget: optionalNumberSchema(),
  expenseBudget: optionalNumberSchema(),
  description: z.string().nullish(),
})

export const costCenterFormSchema = toTypedSchema(costCenterSchema)

export type CostCenterFormValues = z.infer<typeof costCenterSchema>

export const costCenterFormDefaults = { active: true }

export function toCostCenterCreateForm(values: CostCenterFormValues): CostCenterCreateForm {
  return {
    name: values.name,
    description: blankToNull(values.description),
    incomeBudget: values.incomeBudget,
    expenseBudget: values.expenseBudget,
    parentCostCenter: optionId(values.parentCostCenter),
  }
}

export function toCostCenterUpdateForm(values: CostCenterFormValues): CostCenterUpdateForm {
  return { ...toCostCenterCreateForm(values), active: values.active }
}

export function toCostCenterFormValues(costCenter: CostCenterView): Partial<CostCenterFormValues> {
  const parent = costCenter.parentCostCenter
  return {
    active: costCenter.active,
    name: costCenter.name,
    parentCostCenter: parent ? { id: parent.id, label: parent.fullName } : null,
    incomeBudget: costCenter.incomeBudget,
    expenseBudget: costCenter.expenseBudget,
    description: costCenter.description,
  }
}
