import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z.string().min(1).email(),
})

export const forgotPasswordFormSchema = toTypedSchema(forgotPasswordSchema)

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>
