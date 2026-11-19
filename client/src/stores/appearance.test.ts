import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useAppearanceStore } from '@/stores/appearance'
import { mockMatchMedia } from '@/test/matchMedia'

const STORAGE_KEY = 'webbudget.appearance'
const DARK_QUERY = '(prefers-color-scheme: dark)'

describe('appearance store', () => {
  let media: ReturnType<typeof mockMatchMedia>

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    media = mockMatchMedia()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    media.restore()
    vi.restoreAllMocks()
  })

  it('follows the system on a clean start, which is light here', () => {
    const appearance = useAppearanceStore()

    expect(appearance.mode).toBe('system')
    expect(appearance.dark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('goes dark on a clean start when the system is dark', () => {
    media.set(DARK_QUERY, true)

    const appearance = useAppearanceStore()

    expect(appearance.dark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('follows the system while the mode is system, as it changes', async () => {
    const appearance = useAppearanceStore()

    media.set(DARK_QUERY, true)
    await nextTick()

    expect(appearance.dark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    media.set(DARK_QUERY, false)
    await nextTick()

    expect(appearance.dark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('ignores the system once the mode is light or dark', async () => {
    media.set(DARK_QUERY, true)
    const appearance = useAppearanceStore()

    appearance.setMode('light')
    await nextTick()

    expect(appearance.dark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    media.set(DARK_QUERY, false)
    appearance.setMode('dark')
    await nextTick()

    expect(appearance.dark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('persists the chosen mode', () => {
    const appearance = useAppearanceStore()

    appearance.setMode('dark')

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ mode: 'dark' })
  })

  it.each(['light', 'dark', 'system'] as const)('restores the stored %s mode', (mode) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode }))

    expect(useAppearanceStore().mode).toBe(mode)
  })

  it('restores a stored dark mode and applies it to the document', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'dark' }))

    useAppearanceStore()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('migrates the old dark preference', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dark: true }))

    expect(useAppearanceStore().mode).toBe('dark')
  })

  it('treats the old light preference as no choice, because it was written on every start', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dark: false }))

    expect(useAppearanceStore().mode).toBe('system')
  })

  it('does not write to the storage on startup', () => {
    useAppearanceStore()

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('falls back to the system when the stored mode is unknown', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'sepia' }))

    expect(useAppearanceStore().mode).toBe('system')
  })

  it('falls back to the system when the stored payload is malformed', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')

    expect(useAppearanceStore().mode).toBe('system')
  })

  it('falls back to the system when the stored payload is not an object', () => {
    localStorage.setItem(STORAGE_KEY, 'null')

    expect(useAppearanceStore().mode).toBe('system')
  })

  it('keeps working when the storage refuses the write', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    const appearance = useAppearanceStore()

    appearance.setMode('dark')
    await nextTick()

    expect(appearance.dark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
