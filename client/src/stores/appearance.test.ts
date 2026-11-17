import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useAppearanceStore } from '@/stores/appearance'

const STORAGE_KEY = 'webbudget.appearance'

describe('appearance store', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with the light theme on a clean start', () => {
    const appearance = useAppearanceStore()

    expect(appearance.dark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('restores a persisted dark preference and applies it to the document', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dark: true }))

    const appearance = useAppearanceStore()

    expect(appearance.dark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('falls back to the light theme when the stored payload is malformed', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')

    expect(useAppearanceStore().dark).toBe(false)
  })

  it('falls back to the light theme when the stored payload is not an object', () => {
    localStorage.setItem(STORAGE_KEY, 'null')

    expect(useAppearanceStore().dark).toBe(false)
  })

  it('toggles the theme both ways, updating the document and storage', async () => {
    const appearance = useAppearanceStore()

    appearance.toggleDark()
    await nextTick()

    expect(appearance.dark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ dark: true })

    appearance.toggleDark()
    await nextTick()

    expect(appearance.dark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ dark: false })
  })

  it('keeps working when the storage refuses the write', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    const appearance = useAppearanceStore()

    appearance.toggleDark()
    await nextTick()

    expect(appearance.dark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
