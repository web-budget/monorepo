import { z } from 'zod'
import i18n from '@/locales'

function translate(key: string, params: Record<string, unknown> = {}): string {
  return i18n.global.t(`validation.${key}`, params)
}

// Returning undefined makes Zod fall back to its own default message.
export const zodErrorMap: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'invalid_type':
      return translate(issue.input === undefined ? 'required' : 'invalid')
    case 'too_small':
      if (issue.origin === 'string' || issue.origin === 'array') {
        return translate(issue.minimum === 1 ? 'required' : 'string-min', {
          minimum: issue.minimum,
        })
      }
      return translate('number-min', { minimum: issue.minimum })
    case 'too_big':
      return translate(issue.origin === 'string' ? 'string-max' : 'number-max', {
        maximum: issue.maximum,
      })
    case 'invalid_format':
      return translate(issue.format === 'email' ? 'email' : 'invalid')
    case 'custom': {
      const key = issue.params?.i18n
      return typeof key === 'string' ? translate(key) : undefined
    }
    default:
      return undefined
  }
}

export function installZodErrorMap() {
  z.config({ customError: zodErrorMap })
}
