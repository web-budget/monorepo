import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import { optionalNumberSchema } from '@/schemas/fields'
import { MOVEMENT_TYPES } from '@/schemas/movementSchema'
import type {
  MovementType,
  RecurringExtraLaunchForm,
  RecurringMovementCreateForm,
  RecurringMovementUpdateForm,
  RecurringMovementView,
  RecurringValueForm,
} from '@/types'

export const RECURRING_VALUE_KINDS = ['FIXED', 'VARIABLE'] as const

export const NO_CARD = 'none'

export const recurringMovementSchema = z
  .object({
    type: z.enum(MOVEMENT_TYPES),
    name: z.string().min(1).max(150),
    valueKind: z.enum(RECURRING_VALUE_KINDS),
    value: z.number().positive(),
    costCenter: z.string().min(1),
    classification: z.string().min(1),
    indefinite: z.boolean(),
    installments: optionalNumberSchema(z.number().int().min(1)),
    firstInstallment: optionalNumberSchema(z.number().int().min(1)),
    card: z.string().nullish(),
    autoLaunch: z.boolean(),
    active: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.indefinite) {
      return
    }
    if (values.installments === null) {
      context.addIssue({ code: 'custom', path: ['installments'], params: { i18n: 'required' } })
      return
    }
    if (values.firstInstallment !== null && values.firstInstallment > values.installments) {
      context.addIssue({
        code: 'custom',
        path: ['firstInstallment'],
        params: { i18n: 'first-installment-after-last' },
      })
    }
  })

export const recurringMovementFormSchema = toTypedSchema(recurringMovementSchema)

export type RecurringMovementFormValues = z.infer<typeof recurringMovementSchema>

export function recurringMovementFormDefaults() {
  return {
    type: 'EXPENSE' as MovementType,
    valueKind: 'FIXED' as const,
    indefinite: false,
    installments: 12,
    firstInstallment: 1,
    autoLaunch: true,
    active: true,
  }
}

function cardOf(values: RecurringMovementFormValues): string | null {
  return values.type === 'EXPENSE' && values.card && values.card !== NO_CARD ? values.card : null
}

function installmentsOf(values: RecurringMovementFormValues): number | null {
  return values.indefinite ? null : values.installments
}

export function toRecurringMovementCreateForm(
  values: RecurringMovementFormValues,
): RecurringMovementCreateForm {
  return {
    name: values.name,
    type: values.type,
    valueKind: values.valueKind,
    value: values.value,
    installments: installmentsOf(values),
    firstInstallment: values.indefinite ? null : values.firstInstallment,
    autoLaunch: values.autoLaunch,
    classification: values.classification,
    costCenter: values.costCenter,
    card: cardOf(values),
  }
}

export function toRecurringMovementUpdateForm(
  values: RecurringMovementFormValues,
): RecurringMovementUpdateForm {
  return {
    name: values.name,
    active: values.active,
    installments: installmentsOf(values),
    autoLaunch: values.autoLaunch,
    classification: values.classification,
    costCenter: values.costCenter,
    card: cardOf(values),
  }
}

export function toRecurringMovementFormValues(
  recurringMovement: RecurringMovementView,
): Partial<RecurringMovementFormValues> {
  return {
    type: recurringMovement.type,
    name: recurringMovement.name,
    valueKind: recurringMovement.valueKind,
    value: recurringMovement.value,
    costCenter: recurringMovement.costCenter.id,
    classification: recurringMovement.classification.id,
    indefinite: recurringMovement.installments === null,
    installments: recurringMovement.installments,
    firstInstallment: recurringMovement.firstInstallment,
    card: recurringMovement.card?.id ?? NO_CARD,
    autoLaunch: recurringMovement.autoLaunch,
    active: recurringMovement.active,
  }
}

export const readjustSchema = z.object({
  value: z.number().positive(),
  reason: z.string().max(150).nullish(),
})

export const readjustFormSchema = toTypedSchema(readjustSchema)

export type ReadjustFormValues = z.infer<typeof readjustSchema>

export function toRecurringValueForm(values: ReadjustFormValues): RecurringValueForm {
  const reason = values.reason?.trim()
  return { value: values.value, reason: reason ? reason : null }
}

export const launchInPeriodFormSchema = (maximum: number) =>
  toTypedSchema(
    z.object({
      financialPeriod: z.string().min(1),
      quantity: z.preprocess(
        (value) =>
          value === '' || value === null || value === undefined ? undefined : Number(value),
        z.number().int().min(1).max(maximum),
      ),
      value: optionalNumberSchema(z.number().positive()),
    }),
  )

export interface LaunchInPeriodFormValues {
  financialPeriod: string
  quantity: number
  value?: number | null
}

export function toRecurringExtraLaunchForm(
  values: LaunchInPeriodFormValues,
  variable: boolean,
): RecurringExtraLaunchForm {
  const form: RecurringExtraLaunchForm = {
    financialPeriod: values.financialPeriod,
    quantity: values.quantity,
  }
  if (variable && values.value != null) {
    form.value = values.value
  }
  return form
}
