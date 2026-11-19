import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

export const linkSchema = z.object({
  password: z.string().min(1),
})

export const linkFormSchema = toTypedSchema(linkSchema)
