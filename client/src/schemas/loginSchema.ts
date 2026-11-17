import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
})

export const loginFormSchema = toTypedSchema(loginSchema)

export type LoginFormValues = z.infer<typeof loginSchema>
