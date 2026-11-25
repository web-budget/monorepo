import { z } from 'zod'
import { toTypedSchema } from '@/schemas/typedSchema'
import { fitsPasswordBytes, meetsPasswordRequirements } from '@/utils/passwordRules'

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .refine(fitsPasswordBytes, { params: { i18n: 'password-too-long' } })
      .refine(meetsPasswordRequirements, { params: { i18n: 'password-requirements' } }),
    confirmation: z.string().min(1),
  })
  .refine(({ newPassword, confirmation }) => newPassword === confirmation, {
    path: ['confirmation'],
    params: { i18n: 'password-mismatch' },
  })

export const changePasswordFormSchema = toTypedSchema(changePasswordSchema)

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
