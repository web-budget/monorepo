import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { blankToNull, optionalNumberSchema, optionId, selectedOptionSchema } from '@/schemas/fields'
import type { CardCreateForm, CardType, CardUpdateForm, CardView } from '@/types'

export const CARD_TYPES = ['DEBIT', 'CREDIT'] as const

export const MAXIMUM_INVOICE_PAYMENT_DAY = 30

export const cardSchema = z.object({
  active: z.boolean(),
  name: z.string().min(3).max(150),
  type: z.enum(CARD_TYPES),
  wallet: selectedOptionSchema,
  invoicePaymentDay: optionalNumberSchema(z.number().int().min(1).max(MAXIMUM_INVOICE_PAYMENT_DAY)),
  lastFourDigits: z.string().min(1).max(4),
  flag: z.string().nullish(),
})

export const cardFormSchema = toTypedSchema(cardSchema)

export type CardFormValues = z.infer<typeof cardSchema>

export const cardFormDefaults = { active: true }

export function usesWallet(type: CardType | undefined): boolean {
  return type !== 'CREDIT'
}

export function usesInvoice(type: CardType | undefined): boolean {
  return type !== 'DEBIT'
}

function cardData(values: CardFormValues) {
  return {
    name: values.name,
    lastFourDigits: values.lastFourDigits,
    flag: blankToNull(values.flag),
    wallet: usesWallet(values.type) ? optionId(values.wallet) : null,
    invoicePaymentDay: usesInvoice(values.type) ? values.invoicePaymentDay : null,
  }
}

export function toCardCreateForm(values: CardFormValues): CardCreateForm {
  return { ...cardData(values), type: values.type }
}

export function toCardUpdateForm(values: CardFormValues): CardUpdateForm {
  return { ...cardData(values), active: values.active }
}

export function toCardFormValues(card: CardView): Partial<CardFormValues> {
  return {
    active: card.active,
    name: card.name,
    type: card.type,
    wallet: card.wallet ? { id: card.wallet.id, label: card.wallet.name } : null,
    invoicePaymentDay: card.invoicePaymentDay,
    lastFourDigits: card.lastFourDigits,
    flag: card.flag,
  }
}
