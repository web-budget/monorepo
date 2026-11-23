import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import { blankToNull } from '@/schemas/fields'
import type { TransferForm } from '@/types'

export const transferSchema = z
  .object({
    fromWallet: z.string().min(1),
    toWallet: z.string().min(1),
    value: z.number().positive(),
    description: z.string().nullish(),
  })
  .superRefine((values, context) => {
    if (values.fromWallet === values.toWallet) {
      context.addIssue({
        code: 'custom',
        path: ['toWallet'],
        params: { i18n: 'transfer-same-wallet' },
      })
    }
  })

export const transferFormSchema = toTypedSchema(transferSchema)

export type TransferFormValues = z.infer<typeof transferSchema>

export function toTransferForm(values: TransferFormValues): TransferForm {
  return {
    fromWallet: values.fromWallet,
    toWallet: values.toWallet,
    value: values.value,
    description: blankToNull(values.description),
  }
}
