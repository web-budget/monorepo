import { describe, expect, it } from 'vitest'
import {
  detectBrowserLocale,
  isSupportedLocale,
  LANGUAGE_LOCALES,
  LOCALE_LANGUAGES,
  matchLocale,
} from './languages'

describe('languages', () => {
  it('maps every language of the server to a locale and back', () => {
    expect(LANGUAGE_LOCALES).toEqual({ PT_BR: 'pt-BR', EN_US: 'en-US' })
    expect(LOCALE_LANGUAGES).toEqual({ 'pt-BR': 'PT_BR', 'en-US': 'EN_US' })
  })

  it('knows the supported locales', () => {
    expect(isSupportedLocale('pt-BR')).toBe(true)
    expect(isSupportedLocale('en-US')).toBe(true)
    expect(isSupportedLocale('fr-FR')).toBe(false)
    expect(isSupportedLocale(null)).toBe(false)
  })

  it.each([
    ['pt', 'pt-BR'],
    ['pt-BR', 'pt-BR'],
    ['pt-PT', 'pt-BR'],
    ['PT-br', 'pt-BR'],
    ['en', 'en-US'],
    ['en-GB', 'en-US'],
    ['en-US', 'en-US'],
  ])('matches %s to %s', (tag, expected) => {
    expect(matchLocale(tag)).toBe(expected)
  })

  it.each(['fr', 'fr-FR', 'es-419', 'ptx', ''])('does not match %s', (tag) => {
    expect(matchLocale(tag)).toBeUndefined()
  })

  it('takes the first browser language that matches', () => {
    expect(detectBrowserLocale(['fr-FR', 'en-GB', 'pt-BR'])).toBe('en-US')
    expect(detectBrowserLocale(['de', 'pt-PT'])).toBe('pt-BR')
  })

  it('falls back to Portuguese when no browser language matches or there is none', () => {
    expect(detectBrowserLocale(['fr-FR', 'de'])).toBe('pt-BR')
    expect(detectBrowserLocale([])).toBe('pt-BR')
  })
})
