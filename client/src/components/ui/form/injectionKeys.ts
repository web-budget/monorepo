import type { ComputedRef, InjectionKey } from 'vue'

export const FORM_ITEM_INJECTION_KEY = Symbol('FORM_ITEM_INJECTION_KEY') as InjectionKey<string>

export const SERVER_FIELDS_INJECTION_KEY = Symbol('SERVER_FIELDS_INJECTION_KEY') as InjectionKey<
  ComputedRef<string[]>
>

export const SERVER_ERROR_ALERT_ID = 'server-error-alert'
