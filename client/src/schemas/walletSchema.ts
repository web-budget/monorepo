import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { blankToNull, optionalTextSchema } from '@/schemas/fields'
import type { WalletCreateForm, WalletType, WalletUpdateForm, WalletView } from '@/types'

export const WALLET_TYPES = ['PERSONAL', 'INVESTMENT', 'BANK_ACCOUNT'] as const

const BANK_TYPES: WalletType[] = ['BANK_ACCOUNT', 'INVESTMENT']

export const walletSchema = z.object({
  active: z.boolean(),
  name: z.string().min(2).max(150),
  type: z.enum(WALLET_TYPES),
  bank: optionalTextSchema(150),
  agency: optionalTextSchema(10),
  number: optionalTextSchema(16),
  description: optionalTextSchema(255),
})

export const walletFormSchema = toTypedSchema(walletSchema)

export type WalletFormValues = z.infer<typeof walletSchema>

export const walletFormDefaults = { active: true }

export function hasBankData(type: WalletType | undefined): boolean {
  return type !== undefined && BANK_TYPES.includes(type)
}

function bankData(values: WalletFormValues) {
  const bank = hasBankData(values.type)
  return {
    bank: bank ? blankToNull(values.bank) : null,
    agency: bank ? blankToNull(values.agency) : null,
    number: bank ? blankToNull(values.number) : null,
  }
}

export function toWalletCreateForm(values: WalletFormValues): WalletCreateForm {
  return {
    name: values.name,
    type: values.type,
    description: blankToNull(values.description),
    ...bankData(values),
  }
}

export function toWalletUpdateForm(values: WalletFormValues): WalletUpdateForm {
  return {
    name: values.name,
    active: values.active,
    description: blankToNull(values.description),
    ...bankData(values),
  }
}

export function toWalletFormValues(wallet: WalletView): Partial<WalletFormValues> {
  return {
    active: wallet.active,
    name: wallet.name,
    type: wallet.type,
    bank: wallet.bank,
    agency: wallet.agency,
    number: wallet.number,
    description: wallet.description,
  }
}
