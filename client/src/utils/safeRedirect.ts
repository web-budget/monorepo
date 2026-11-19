export function safeRedirect(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return null
  }
  if (value.startsWith('//') || value.startsWith('/\\')) {
    return null
  }
  return value
}
