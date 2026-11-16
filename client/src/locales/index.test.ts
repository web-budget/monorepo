import { describe, expect, it } from 'vitest'
import enUS from './en_US.json'
import { i18n, SUPPORTED_LOCALES } from './index'
import ptBR from './pt_BR.json'

function keysOf(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keysOf(value as object, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

describe('i18n', () => {
  it('starts in Brazilian Portuguese', () => {
    expect(i18n.global.locale.value).toBe('pt-BR')
    expect(i18n.global.availableLocales).toEqual(expect.arrayContaining([...SUPPORTED_LOCALES]))
  })

  it('translates a message', () => {
    expect(i18n.global.t('form.save')).toBe('Salvar')
  })

  it('interpolates named parameters', () => {
    expect(i18n.global.t('error.conflict.wallet.name', { value: 'Main' })).toBe(
      'Nome "Main" já esta em uso',
    )
  })

  it('falls back to Portuguese for a message English does not have', () => {
    expect(i18n.global.t('form.save', {}, { locale: 'en-US' })).toBe('Salvar')
  })

  it('formats currency per locale', () => {
    expect(i18n.global.n(1234.5, 'currency', 'pt-BR')).toBe('R$ 1.234,50')
    expect(i18n.global.n(1234.5, 'currency', 'en-US')).toBe('$1,234.50')
  })

  it('formats dates per locale', () => {
    const date = new Date(2026, 0, 31)

    expect(i18n.global.d(date, 'short', 'pt-BR')).toBe('31/01/2026')
    expect(i18n.global.d(date, 'short', 'en-US')).toBe('1/31/2026')
  })

  it('has no message left empty', () => {
    const empty = keysOf(ptBR).filter((key) => i18n.global.t(key) === '')

    expect(empty).toEqual([])
  })

  it('keeps English keys a subset of the Portuguese ones', () => {
    const portuguese = new Set(keysOf(ptBR))

    expect(keysOf(enUS).filter((key) => !portuguese.has(key))).toEqual([])
  })

  it('carries nothing from the investment section', () => {
    const keys = keysOf(ptBR)

    expect(
      keys.filter((key) => /^(stocks|funds|current-position)\.|^menu\.investment$/.test(key)),
    ).toEqual([])
  })
})
