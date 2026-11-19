import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { meetsPasswordRequirements } from '@/utils/passwordRules'

export const recoverPasswordSchema = z
  .object({
    password: z.string().refine(meetsPasswordRequirements, {
      params: { i18n: 'password-requirements' },
    }),
    confirmation: z.string().min(1),
  })
  .refine(({ password, confirmation }) => password === confirmation, {
    path: ['confirmation'],
    params: { i18n: 'password-mismatch' },
  })

export const recoverPasswordFormSchema = toTypedSchema(recoverPasswordSchema)

export type RecoverPasswordFormValues = z.infer<typeof recoverPasswordSchema>
