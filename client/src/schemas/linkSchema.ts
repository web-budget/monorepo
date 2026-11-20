import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'

export const linkSchema = z.object({
  password: z.string().min(1),
})

export const linkFormSchema = toTypedSchema(linkSchema)
