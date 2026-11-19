const handled = new WeakSet<object>()

export function markHandled(error: unknown): void {
  if (typeof error === 'object' && error !== null) {
    handled.add(error)
  }
}

export function isHandled(error: unknown): boolean {
  return typeof error === 'object' && error !== null && handled.has(error)
}
