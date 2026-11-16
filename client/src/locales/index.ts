import { createI18n } from 'vue-i18n'
import enUS from './en_US.json'
import ptBR from './pt_BR.json'

export type MessageSchema = typeof ptBR

export const SUPPORTED_LOCALES = ['pt-BR', 'en-US'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const numberFormats = {
  'en-US': {
    currency: { style: 'currency', currency: 'USD', notation: 'standard' },
    decimal: { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 },
    percent: { style: 'percent', useGrouping: false },
  },
  'pt-BR': {
    currency: { style: 'currency', currency: 'BRL', useGrouping: true, currencyDisplay: 'symbol' },
    decimal: { style: 'decimal', minimumSignificantDigits: 2, maximumSignificantDigits: 2 },
    percent: { style: 'percent', useGrouping: false },
  },
} as const

const dateTimeFormat = {
  short: { year: 'numeric', month: 'numeric', day: 'numeric' },
  long: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
  },
} as const

export const i18n = createI18n({
  legacy: false,
  locale: 'pt-BR',
  fallbackLocale: 'pt-BR',
  messages: {
    'pt-BR': ptBR,
    'en-US': enUS as Partial<MessageSchema>,
  },
  numberFormats,
  datetimeFormats: { 'pt-BR': dateTimeFormat, 'en-US': dateTimeFormat },
})

export default i18n
