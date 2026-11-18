import type { AxiosResponse } from 'axios'

export function createdId(response: AxiosResponse): string {
  const location = String(response.headers['location'] ?? '')
  return location.split('/').filter(Boolean).pop() ?? ''
}
