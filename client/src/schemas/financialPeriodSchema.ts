import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { optionalNumberSchema } from '@/schemas/fields'
import type {
  FinancialPeriodCreateForm,
  FinancialPeriodUpdateForm,
  FinancialPeriodView,
} from '@/types'

export const financialPeriodSchema = z
  .object({
    name: z.string().min(3).max(150),
    startingAt: z.string().min(1),
    endingAt: z.string().min(1),
    revenuesGoal: optionalNumberSchema(),
    expensesGoal: optionalNumberSchema(),
  })
  .superRefine((values, context) => {
    if (values.endingAt !== '' && values.endingAt < values.startingAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endingAt'],
        params: { i18nKey: 'end-before-start' },
      })
    }
  })

export const financialPeriodFormSchema = toTypedSchema(financialPeriodSchema)

export type FinancialPeriodFormValues = z.infer<typeof financialPeriodSchema>

export function toFinancialPeriodCreateForm(
  values: FinancialPeriodFormValues,
): FinancialPeriodCreateForm {
  return {
    name: values.name,
    startingAt: values.startingAt,
    endingAt: values.endingAt,
    revenuesGoal: values.revenuesGoal,
    expensesGoal: values.expensesGoal,
  }
}

export function toFinancialPeriodUpdateForm(
  values: FinancialPeriodFormValues,
): FinancialPeriodUpdateForm {
  return {
    name: values.name,
    revenuesGoal: values.revenuesGoal,
    expensesGoal: values.expensesGoal,
  }
}

export function toFinancialPeriodFormValues(
  financialPeriod: FinancialPeriodView,
): FinancialPeriodFormValues {
  return {
    name: financialPeriod.name,
    startingAt: financialPeriod.startingAt,
    endingAt: financialPeriod.endingAt,
    revenuesGoal: financialPeriod.revenuesGoal,
    expensesGoal: financialPeriod.expensesGoal,
  }
}
