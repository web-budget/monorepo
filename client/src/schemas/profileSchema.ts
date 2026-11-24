import { z } from 'zod'
import { toTypedSchema } from '@/schemas/typedSchema'

const CONTROL_CHARACTERS = /[\p{Cc}\p{Zl}\p{Zp}]/u

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine((name) => !CONTROL_CHARACTERS.test(name), { params: { i18n: 'invalid' } }),
})

export const profileFormSchema = toTypedSchema(profileSchema)

export type ProfileFormValues = z.infer<typeof profileSchema>
