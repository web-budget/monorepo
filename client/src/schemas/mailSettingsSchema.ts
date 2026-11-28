import { z } from 'zod'
import { toTypedSchema } from '@/schemas/typedSchema'
import type { MailSecurity, MailSettingsForm, MailSettingsView } from '@/types'

export const MAIL_SECURITIES: MailSecurity[] = ['NONE', 'STARTTLS', 'SSL_TLS']

const MINIMUM_PORT = 1

const MAXIMUM_PORT = 65535

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function required(message: string) {
  return z.string().superRefine((value, context) => {
    if (value.trim() === '') {
      context.addIssue({ code: 'custom', params: { i18n: message } })
    }
  })
}

function email(requiredMessage?: string) {
  return z.string().superRefine((value, context) => {
    const trimmed = value.trim()
    if (trimmed === '' && requiredMessage !== undefined) {
      context.addIssue({ code: 'custom', params: { i18n: requiredMessage } })
    } else if (trimmed !== '' && !EMAIL_PATTERN.test(trimmed)) {
      context.addIssue({ code: 'custom', params: { i18n: 'mail-email-invalid' } })
    }
  })
}

const portSchema = z.string().superRefine((value, context) => {
  const trimmed = value.trim()
  if (trimmed === '') {
    context.addIssue({ code: 'custom', params: { i18n: 'mail-port-required' } })
    return
  }
  const port = Number(trimmed)
  if (!Number.isInteger(port) || port < MINIMUM_PORT || port > MAXIMUM_PORT) {
    context.addIssue({ code: 'custom', params: { i18n: 'mail-port-invalid' } })
  }
})

export const mailSettingsSchema = z.object({
  host: required('mail-host-required'),
  port: portSchema,
  security: z.enum(MAIL_SECURITIES),
  username: z.string(),
  password: z.string(),
  fromAddress: email('mail-from-address-required'),
  fromName: z.string(),
  replyToAddress: email(),
})

export const mailSettingsFormSchema = toTypedSchema(mailSettingsSchema)

export const mailTestRecipientSchema = email('mail-recipient-required')

export type MailSettingsFormValues = z.infer<typeof mailSettingsSchema>

function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function toMailSettingsForm(values: MailSettingsFormValues): MailSettingsForm {
  const username = blankToNull(values.username)
  return {
    host: values.host.trim(),
    port: Number(values.port.trim()),
    security: values.security,
    username,
    password: username === null || values.password === '' ? null : values.password,
    fromAddress: values.fromAddress.trim(),
    fromName: blankToNull(values.fromName),
    replyToAddress: blankToNull(values.replyToAddress),
  }
}

export function toMailSettingsFormValues(settings: MailSettingsView): MailSettingsFormValues {
  return {
    host: settings.host ?? '',
    port: settings.port === null ? '' : String(settings.port),
    security: settings.security,
    username: settings.username ?? '',
    password: '',
    fromAddress: settings.fromAddress ?? '',
    fromName: settings.fromName ?? '',
    replyToAddress: settings.replyToAddress ?? '',
  }
}
