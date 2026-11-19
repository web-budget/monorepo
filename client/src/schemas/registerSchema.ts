import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { fitsPasswordBytes, meetsPasswordRequirements } from '@/utils/passwordRules'

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().min(1).max(254).email(),
  password: z
    .string()
    .refine(meetsPasswordRequirements, { params: { i18n: 'password-requirements' } })
    .refine(fitsPasswordBytes, { params: { i18n: 'password-too-long' } }),
})

export const registerFormSchema = toTypedSchema(registerSchema)

export type RegisterFormValues = z.infer<typeof registerSchema>
