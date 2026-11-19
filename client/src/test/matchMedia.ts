type Listener = (event: MediaQueryListEvent) => void

export function mockMatchMedia(initial: Record<string, boolean> = {}) {
  const original = window.matchMedia
  const state = new Map(Object.entries(initial))
  const listeners = new Map<string, Set<Listener>>()

  window.matchMedia = (query: string) =>
    ({
      get matches() {
        return state.get(query) ?? false
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: Listener) => {
        listeners.set(query, (listeners.get(query) ?? new Set()).add(listener))
      },
      removeEventListener: (_type: string, listener: Listener) => {
        listeners.get(query)?.delete(listener)
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList

  return {
    set(query: string, matches: boolean) {
      state.set(query, matches)
      listeners.get(query)?.forEach((listener) => listener({ matches } as MediaQueryListEvent))
    },
    restore() {
      window.matchMedia = original
    },
  }
}
