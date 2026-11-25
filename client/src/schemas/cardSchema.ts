import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import { blankToNull, optionId, selectedOptionSchema } from '@/schemas/fields'
import type { CardCreateForm, CardUpdateForm, CardView } from '@/types'
import { walletLabel } from '@/utils/walletLabel'

export const MAXIMUM_INVOICE_PAYMENT_DAY = 30

export const cardSchema = z.object({
  active: z.boolean(),
  name: z.string().min(3).max(150),
  wallet: selectedOptionSchema,
  invoicePaymentDay: z.number().int().min(1).max(MAXIMUM_INVOICE_PAYMENT_DAY),
  lastFourDigits: z.string().min(1).max(4),
  flag: z.string().nullish(),
})

export const cardFormSchema = toTypedSchema(cardSchema)

export type CardFormValues = z.infer<typeof cardSchema>

export const cardFormDefaults = { active: true }

function cardData(values: CardFormValues) {
  return {
    name: values.name,
    lastFourDigits: values.lastFourDigits,
    flag: blankToNull(values.flag),
    wallet: optionId(values.wallet),
    invoicePaymentDay: values.invoicePaymentDay,
  }
}

export function toCardCreateForm(values: CardFormValues): CardCreateForm {
  return cardData(values)
}

export function toCardUpdateForm(values: CardFormValues): CardUpdateForm {
  return { ...cardData(values), active: values.active }
}

export function toCardFormValues(card: CardView): Partial<CardFormValues> {
  return {
    active: card.active,
    name: card.name,
    wallet: card.wallet ? { id: card.wallet.id, label: walletLabel(card.wallet) } : null,
    invoicePaymentDay: card.invoicePaymentDay,
    lastFourDigits: card.lastFourDigits,
    flag: card.flag,
  }
}
