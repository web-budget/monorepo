import { describe, expect, it } from 'vitest'
import enUS from './en_US.json'
import { i18n, SUPPORTED_LOCALES } from './index'
import ptBR from './pt_BR.json'

function entriesOf(messages: object, prefix = ''): [string, string][] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? entriesOf(value as object, `${prefix}${key}.`)
      : [[`${prefix}${key}`, String(value)] as [string, string]],
  )
}

function keysOf(messages: object): string[] {
  return entriesOf(messages).map(([key]) => key)
}

describe('i18n', () => {
  it('starts in Brazilian Portuguese', () => {
    expect(i18n.global.locale.value).toBe('pt-BR')
    expect(i18n.global.availableLocales).toEqual(expect.arrayContaining([...SUPPORTED_LOCALES]))
  })

  it('translates a message', () => {
    expect(i18n.global.t('form.save')).toBe('Salvar')
    expect(i18n.global.t('form.save', {}, { locale: 'en-US' })).toBe('Save')
  })

  it('interpolates named parameters', () => {
    expect(i18n.global.t('error.conflict.wallet.name', { value: 'Main' })).toBe(
      'Nome "Main" já está em uso',
    )
    expect(
      i18n.global.t('error.conflict.wallet.name', { value: 'Main' }, { locale: 'en-US' }),
    ).toBe('Name "Main" is already in use')
  })

  it('interpolates the hyphenated parameters the server sends', () => {
    expect(
      i18n.global.t('error.bad-request.invalid-invoice-payment-day', { 'payment-day': 31 }),
    ).toBe('31 não é um dia do mês válido, use algo entre 1 e 30')
    expect(
      i18n.global.t(
        'error.bad-request.invalid-invoice-payment-day',
        { 'payment-day': 31 },
        { locale: 'en-US' },
      ),
    ).toBe('31 is not a valid day of the month, use something between 1 and 30')
  })

  it('formats currency per locale, in reais in both', () => {
    expect(i18n.global.n(1234.5, 'currency', 'pt-BR')).toBe('R$ 1.234,50')
    expect(i18n.global.n(1234.5, 'currency', 'en-US')).toBe('R$1,234.50')
  })

  it('formats dates per locale', () => {
    const date = new Date(2026, 0, 31)

    expect(i18n.global.d(date, 'short', 'pt-BR')).toBe('31/01/2026')
    expect(i18n.global.d(date, 'short', 'en-US')).toBe('1/31/2026')
  })

  it('has no message left empty in either language', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const empty = keysOf(ptBR).filter((key) => i18n.global.t(key, {}, { locale }) === '')

      expect(empty).toEqual([])
    }
  })

  it('has exactly the same keys in Portuguese and in English', () => {
    const portuguese = keysOf(ptBR)
    const english = keysOf(enUS)

    expect(english.filter((key) => !portuguese.includes(key))).toEqual([])
    expect(portuguese.filter((key) => !english.includes(key))).toEqual([])
  })

  it('keeps the same parameters in the English messages', () => {
    const parameters = (text: string) =>
      [...text.matchAll(/\{[\w-]+\}/g)].map(([match]) => match).sort()
    const english = new Map(entriesOf(enUS))

    const mismatched = entriesOf(ptBR)
      .filter(
        ([key, portuguese]) =>
          parameters(english.get(key) ?? '').join() !== parameters(portuguese).join(),
      )
      .map(([key]) => key)

    expect(mismatched).toEqual([])
  })

  it('carries nothing from the investment section', () => {
    const keys = keysOf(ptBR)

    expect(
      keys.filter((key) => /^(stocks|funds|current-position)\.|^menu\.investment$/.test(key)),
    ).toEqual([])
  })
})
