import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import type { Language, UserCreateForm, UserUpdateForm, UserView } from '@/types'

export const LANGUAGES = ['PT_BR', 'EN_US'] as const

const baseSchema = z.object({
  active: z.boolean(),
  name: z.string().min(2).max(150),
  email: z.string().max(150),
  password: z.string().max(100),
  defaultLanguage: z.enum(LANGUAGES),
  roles: z.array(z.string()).refine((roles) => roles.length > 0, {
    params: { i18n: 'roles-required' },
  }),
  sendActivationEmail: z.boolean(),
})

export const userCreateSchema = baseSchema.extend({
  email: z.string().min(1).max(150).email(),
  password: z.string().min(8).max(100),
})

export const userUpdateSchema = baseSchema

export const userCreateFormSchema = toTypedSchema(userCreateSchema)
export const userUpdateFormSchema = toTypedSchema(userUpdateSchema)

export type UserFormValues = z.infer<typeof baseSchema>

export const userFormDefaults = {
  active: true,
  name: '',
  email: '',
  password: '',
  defaultLanguage: 'PT_BR' as Language,
  roles: [] as string[],
  sendActivationEmail: true,
}

export function toUserCreateForm(values: UserFormValues): UserCreateForm {
  return {
    name: values.name,
    email: values.email,
    password: values.password,
    defaultLanguage: values.defaultLanguage,
    roles: values.roles,
    sendActivationEmail: values.sendActivationEmail,
  }
}

export function toUserUpdateForm(values: UserFormValues): UserUpdateForm {
  return {
    active: values.active,
    name: values.name,
    defaultLanguage: values.defaultLanguage,
    roles: values.roles,
  }
}

export function toUserFormValues(user: UserView): Partial<UserFormValues> {
  return {
    active: user.active,
    name: user.name,
    email: user.email,
    defaultLanguage: user.defaultLanguage,
    roles: user.authorities,
  }
}

export const userPasswordSchema = z
  .object({
    password: z.string().min(8).max(100),
    confirmation: z.string().min(1),
  })
  .refine((values) => values.password === values.confirmation, {
    path: ['confirmation'],
    params: { i18n: 'password-mismatch' },
  })

export const userPasswordFormSchema = toTypedSchema(userPasswordSchema)

export const approveSchema = z.object({ roles: baseSchema.shape.roles })

export const approveFormSchema = toTypedSchema(approveSchema)
