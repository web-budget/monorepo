import { afterEach } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import i18n from '@/locales'
import { DEFAULT_LOCALE } from '@/locales/languages'

enableAutoUnmount(afterEach)

Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR'], configurable: true })

afterEach(() => {
  i18n.global.locale.value = DEFAULT_LOCALE
  document.documentElement.lang = ''
  localStorage.removeItem('webbudget.language')
})

class ResizeObserverStub {
  observe() {
    return undefined
  }
  unobserve() {
    return undefined
  }
  disconnect() {
    return undefined
  }
}

globalThis.ResizeObserver = ResizeObserverStub

window.matchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
})

Element.prototype.scrollIntoView = () => undefined
