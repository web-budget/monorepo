import { z } from 'zod'
import { toTypedSchema } from '@/schemas/typedSchema'
import { SUPPORTED_LOCALES } from '@/locales/languages'

export const profileSchema = z.object({
  language: z.enum(SUPPORTED_LOCALES),
  dueDateNotices: z.boolean(),
})

export const profileFormSchema = toTypedSchema(profileSchema)

export type ProfileFormValues = z.infer<typeof profileSchema>
