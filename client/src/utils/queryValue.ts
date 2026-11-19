import type { LocationQueryValue } from 'vue-router'

export function queryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  const single = Array.isArray(value) ? value[0] : value
  return single ?? ''
}
