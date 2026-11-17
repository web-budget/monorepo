import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

export const recoverPasswordSchema = z
  .object({
    password: z.string().min(3),
    confirmation: z.string().min(1),
  })
  .refine(({ password, confirmation }) => password === confirmation, {
    path: ['confirmation'],
    params: { i18n: 'password-mismatch' },
  })

export const recoverPasswordFormSchema = toTypedSchema(recoverPasswordSchema)

export type RecoverPasswordFormValues = z.infer<typeof recoverPasswordSchema>
