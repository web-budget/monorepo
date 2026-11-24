import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import { blankToNull, optionalNumberSchema } from '@/schemas/fields'
import type {
  CardPurchaseCreateForm,
  CardPurchaseUpdateForm,
  CardPurchaseView,
  RecurringMovementCreateForm,
} from '@/types'
import { formatLocalDate } from '@/utils/localDate'

export const MINIMUM_INSTALLMENTS = 2

export const cardPurchaseSchema = z
  .object({
    card: z.string().min(1),
    financialPeriod: z.string().min(1),
    name: z.string().min(1).max(150),
    purchasedOn: z.string().nullish(),
    value: z.number().positive().nullish(),
    costCenter: z.string().min(1),
    classification: z.string().min(1),
    installmentPurchase: z.boolean(),
    installments: optionalNumberSchema(z.number().int()),
    installmentValue: z.number().positive().nullish(),
  })
  .superRefine((values, context) => {
    const required = (path: string) =>
      context.addIssue({ code: 'custom', path: [path], params: { i18n: 'required' } })
    if (!values.installmentPurchase) {
      if (values.value == null) {
        required('value')
      }
      return
    }
    if (values.installments === null) {
      required('installments')
    } else if (values.installments < MINIMUM_INSTALLMENTS) {
      context.addIssue({
        code: 'too_small',
        origin: 'number',
        minimum: MINIMUM_INSTALLMENTS,
        inclusive: true,
        input: values.installments,
        path: ['installments'],
      })
    }
    if (values.installmentValue == null) {
      required('installmentValue')
    }
  })

export const cardPurchaseFormSchema = toTypedSchema(cardPurchaseSchema)

export type CardPurchaseFormValues = z.infer<typeof cardPurchaseSchema>

export function cardPurchaseFormDefaults() {
  return {
    purchasedOn: formatLocalDate(new Date()),
    installmentPurchase: false,
    installments: 12,
  }
}

export function toCardPurchaseCreateForm(values: CardPurchaseFormValues): CardPurchaseCreateForm {
  return {
    name: values.name,
    purchasedOn: blankToNull(values.purchasedOn),
    value: values.value as number,
    card: values.card,
    financialPeriod: values.financialPeriod,
    classification: values.classification,
    costCenter: values.costCenter,
  }
}

export function toInstallmentRecurringForm(
  values: CardPurchaseFormValues,
): RecurringMovementCreateForm {
  return {
    name: values.name,
    type: 'EXPENSE',
    valueKind: 'FIXED',
    value: values.installmentValue as number,
    installments: values.installments,
    firstInstallment: 1,
    autoLaunch: true,
    classification: values.classification,
    costCenter: values.costCenter,
    card: values.card,
  }
}

export function toCardPurchaseUpdateForm(values: CardPurchaseFormValues): CardPurchaseUpdateForm {
  return {
    name: values.name,
    purchasedOn: blankToNull(values.purchasedOn),
    value: values.value as number,
    classification: values.classification,
    costCenter: values.costCenter,
  }
}

export function toCardPurchaseFormValues(
  purchase: CardPurchaseView,
): Partial<CardPurchaseFormValues> {
  return {
    card: purchase.card.id,
    financialPeriod: purchase.financialPeriod.id,
    name: purchase.name,
    purchasedOn: purchase.purchasedOn,
    value: purchase.value,
    costCenter: purchase.costCenter.id,
    classification: purchase.classification.id,
    installmentPurchase: false,
  }
}
