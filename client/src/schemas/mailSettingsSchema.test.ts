import { beforeEach, describe, expect, it } from 'vitest'
import {
  mailSettingsSchema,
  type MailSettingsFormValues,
  mailTestRecipientSchema,
  toMailSettingsForm,
  toMailSettingsFormValues,
} from '@/schemas/mailSettingsSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import type { MailSettingsView } from '@/types'

const valid: MailSettingsFormValues = {
  host: 'smtp.example.com',
  port: '587',
  security: 'STARTTLS',
  username: '',
  password: '',
  fromAddress: 'alerts@example.com',
  fromName: '',
  replyToAddress: '',
}

function messagesFor(overrides: Record<string, unknown>) {
  const result = mailSettingsSchema.safeParse({ ...valid, ...overrides })
  return result.success
    ? []
    : result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`)
}

describe('mailSettingsSchema', () => {
  beforeEach(installZodErrorMap)

  it('accepts a complete form and the optional fields filled in', () => {
    expect(messagesFor({})).toEqual([])
    expect(
      messagesFor({ username: 'sender', password: 'secret', replyToAddress: 'help@example.com' }),
    ).toEqual([])
  })

  it('asks for the server, the port and the sender e-mail', () => {
    expect(messagesFor({ host: '  ', port: '', fromAddress: ' ' })).toEqual([
      'host: Informe o servidor.',
      'port: Informe a porta.',
      'fromAddress: Informe o e-mail do remetente.',
    ])
  })

  it.each(['0', '65536', '70000', '25.5', 'abc'])('refuses the port %s as invalid', (port) => {
    expect(messagesFor({ port })).toEqual(['port: Valor inválido.'])
  })

  it.each(['1', '587', '65535'])('accepts the port %s', (port) => {
    expect(messagesFor({ port })).toEqual([])
  })

  it('refuses badly written e-mails, but lets Responder para stay empty', () => {
    expect(messagesFor({ fromAddress: 'alerts@', replyToAddress: 'help' })).toEqual([
      'fromAddress: Informe um e-mail válido.',
      'replyToAddress: Informe um e-mail válido.',
    ])
  })

  it('refuses a security that the server does not know', () => {
    expect(messagesFor({ security: 'TLS' })).toHaveLength(1)
  })

  it('validates the recipient of the test', () => {
    const messageOf = (value: string) => {
      const result = mailTestRecipientSchema.safeParse(value)
      return result.success ? null : result.error.issues[0]?.message
    }

    expect(messageOf('')).toBe('Informe o destinatário.')
    expect(messageOf('ana')).toBe('Informe um e-mail válido.')
    expect(messageOf(' ana@example.com ')).toBeNull()
  })
})

describe('mail settings conversions', () => {
  it('trims the text and turns blank optional fields into null', () => {
    expect(
      toMailSettingsForm({
        ...valid,
        host: ' smtp.example.com ',
        port: ' 465 ',
        security: 'SSL_TLS',
      }),
    ).toEqual({
      host: 'smtp.example.com',
      port: 465,
      security: 'SSL_TLS',
      username: null,
      password: null,
      fromAddress: 'alerts@example.com',
      fromName: null,
      replyToAddress: null,
    })
  })

  it('sends the password untrimmed, but only with a user and only when typed', () => {
    const withUser = {
      ...valid,
      username: ' sender ',
      fromName: ' Alerts ',
      replyToAddress: 'a@b.co',
    }

    expect(toMailSettingsForm({ ...withUser, password: ' secret ' })).toMatchObject({
      username: 'sender',
      password: ' secret ',
      fromName: 'Alerts',
      replyToAddress: 'a@b.co',
    })
    expect(toMailSettingsForm({ ...withUser, password: '' }).password).toBeNull()
    expect(toMailSettingsForm({ ...valid, password: 'secret' }).password).toBeNull()
  })

  const view: MailSettingsView = {
    enabled: true,
    configured: true,
    host: 'smtp.example.com',
    port: 587,
    security: 'NONE',
    username: 'sender',
    passwordSet: true,
    passwordStorageAvailable: true,
    fromAddress: 'alerts@example.com',
    fromName: 'Alerts',
    replyToAddress: 'help@example.com',
    lastUpdate: null,
  }

  it('fills the form from the saved view and never from the password', () => {
    expect(toMailSettingsFormValues(view)).toEqual({
      host: 'smtp.example.com',
      port: '587',
      security: 'NONE',
      username: 'sender',
      password: '',
      fromAddress: 'alerts@example.com',
      fromName: 'Alerts',
      replyToAddress: 'help@example.com',
    })
  })

  it('shows empty fields for a server that was never saved', () => {
    expect(
      toMailSettingsFormValues({
        ...view,
        configured: false,
        host: null,
        port: null,
        username: null,
        fromAddress: null,
        fromName: null,
        replyToAddress: null,
      }),
    ).toEqual({
      host: '',
      port: '',
      security: 'NONE',
      username: '',
      password: '',
      fromAddress: '',
      fromName: '',
      replyToAddress: '',
    })
  })
})
