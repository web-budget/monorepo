import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import type { CardPurchaseCreateForm, CardPurchaseUpdateForm, CardPurchaseView } from '@/types'
import { formatLocalDate } from '@/utils/localDate'

export const cardPurchaseSchema = z.object({
  card: z.string().min(1),
  financialPeriod: z.string().min(1),
  name: z.string().min(1).max(150),
  purchasedOn: z.string().min(1),
  value: z.number().positive(),
  costCenter: z.string().min(1),
  classification: z.string().min(1),
})

export const cardPurchaseFormSchema = toTypedSchema(cardPurchaseSchema)

export type CardPurchaseFormValues = z.infer<typeof cardPurchaseSchema>

export function cardPurchaseFormDefaults() {
  return { purchasedOn: formatLocalDate(new Date()) }
}

export function toCardPurchaseCreateForm(values: CardPurchaseFormValues): CardPurchaseCreateForm {
  return {
    name: values.name,
    purchasedOn: values.purchasedOn,
    value: values.value,
    card: values.card,
    financialPeriod: values.financialPeriod,
    classification: values.classification,
    costCenter: values.costCenter,
  }
}

export function toCardPurchaseUpdateForm(values: CardPurchaseFormValues): CardPurchaseUpdateForm {
  return {
    name: values.name,
    purchasedOn: values.purchasedOn,
    value: values.value,
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
  }
}
