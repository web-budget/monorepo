import type { Language } from '@/types'

export const SUPPORTED_LOCALES = ['pt-BR', 'en-US'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'pt-BR'

export const LANGUAGE_LOCALES: Record<Language, SupportedLocale> = {
  PT_BR: 'pt-BR',
  EN_US: 'en-US',
}

export const LOCALE_LANGUAGES: Record<SupportedLocale, Language> = {
  'pt-BR': 'PT_BR',
  'en-US': 'EN_US',
}

const LANGUAGE_PREFIXES: Record<string, SupportedLocale> = {
  pt: 'pt-BR',
  en: 'en-US',
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale)
}

export function matchLocale(tag: string): SupportedLocale | undefined {
  const [prefix = ''] = tag.toLowerCase().split('-')
  return LANGUAGE_PREFIXES[prefix]
}

export function detectBrowserLocale(tags: readonly string[]): SupportedLocale {
  return tags.map(matchLocale).find((locale) => locale !== undefined) ?? DEFAULT_LOCALE
}

export const LANGUAGE_NAMES: Record<SupportedLocale, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English',
}
