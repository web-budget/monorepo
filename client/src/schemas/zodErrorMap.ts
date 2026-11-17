import { z } from 'zod'
import i18n from '@/locales'

function translate(key: string, params: Record<string, unknown> = {}): string {
  return i18n.global.t(`validation.${key}`, params)
}

export const zodErrorMap: z.ZodErrorMap = (issue, context) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return {
        message: translate(issue.received === 'undefined' ? 'required' : 'invalid'),
      }
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return {
          message: translate(issue.minimum === 1 ? 'required' : 'string-min', {
            minimum: issue.minimum,
          }),
        }
      }
      return { message: translate('number-min', { minimum: issue.minimum }) }
    case z.ZodIssueCode.too_big:
      return {
        message: translate(issue.type === 'string' ? 'string-max' : 'number-max', {
          maximum: issue.maximum,
        }),
      }
    case z.ZodIssueCode.invalid_string:
      return { message: translate(issue.validation === 'email' ? 'email' : 'invalid') }
    case z.ZodIssueCode.custom:
      return { message: translate((issue.params as { i18nKey: string }).i18nKey) }
    default:
      return { message: context.defaultError }
  }
}

export function installZodErrorMap() {
  z.setErrorMap(zodErrorMap)
}
