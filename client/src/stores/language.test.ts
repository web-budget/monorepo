import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { authApi } from '@/api/auth'
import i18n from '@/locales'
import type { SessionResponse } from '@/types'
import { useAuthStore } from './auth'
import { useLanguageStore } from './language'

vi.mock('@/api/auth')
vi.mock('@/router', () => ({
  default: { currentRoute: { value: {} }, replace: vi.fn<() => Promise<void>>() },
}))

const STORAGE_KEY = 'webbudget.language'

const session: SessionResponse = {
  name: 'Ana',
  email: 'ana@example.com',
  status: 'APPROVED',
  language: 'PT_BR',
  hasPassword: true,
  googleLinked: false,
  totpEnabled: false,
  totpRequired: false,
  roles: [],
}

function browserLanguages(languages: readonly string[] | undefined, language = 'pt-BR') {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages as string[])
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(language)
}

describe('language store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts in the preferred language of the browser when nothing was chosen', () => {
    browserLanguages(['fr-FR', 'en-GB'])

    const language = useLanguageStore()

    expect(language.locale).toBe('en-US')
    expect(i18n.global.locale.value).toBe('en-US')
    expect(document.documentElement.lang).toBe('en-US')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('falls back to Portuguese when the browser prefers nothing supported', () => {
    browserLanguages(['fr-FR'])

    expect(useLanguageStore().locale).toBe('pt-BR')
  })

  it('reads the single browser language when the list of languages is missing', () => {
    browserLanguages(undefined, 'en-US')

    expect(useLanguageStore().locale).toBe('en-US')
  })

  it('prefers what was chosen before to the browser', () => {
    browserLanguages(['en-US'])
    localStorage.setItem(STORAGE_KEY, 'pt-BR')

    expect(useLanguageStore().locale).toBe('pt-BR')
  })

  it('ignores a stored value that is not a supported locale', () => {
    browserLanguages(['en-US'])
    localStorage.setItem(STORAGE_KEY, 'fr-FR')

    expect(useLanguageStore().locale).toBe('en-US')
  })

  it('starts from the browser when the storage cannot be read', () => {
    browserLanguages(['en-US'])
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(useLanguageStore().locale).toBe('en-US')
  })

  it('switches the whole app and remembers the choice without a session', async () => {
    const language = useLanguageStore()

    await language.select('en-US')

    expect(language.locale).toBe('en-US')
    expect(i18n.global.t('form.save')).toBe('Save')
    expect(document.documentElement.lang).toBe('en-US')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en-US')
    expect(authApi.changeLanguage).not.toHaveBeenCalled()
  })

  it('still switches when the choice cannot be stored', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const language = useLanguageStore()

    await language.select('en-US')

    expect(language.locale).toBe('en-US')
  })

  it('follows the language of the profile when the session opens', async () => {
    const language = useLanguageStore()
    const auth = useAuthStore()

    auth.session = { ...session, language: 'EN_US' }
    await nextTick()

    expect(language.locale).toBe('en-US')
    expect(i18n.global.locale.value).toBe('en-US')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en-US')
  })

  it('starts in the language of the profile when the session is already there', () => {
    setActivePinia(createPinia())
    useAuthStore().session = { ...session, language: 'EN_US' }

    expect(useLanguageStore().locale).toBe('en-US')
  })

  it('keeps the current language when the profile has one the client does not know', async () => {
    const language = useLanguageStore()
    const auth = useAuthStore()

    auth.session = { ...session, language: 'FR_FR' as never }
    await nextTick()

    expect(language.locale).toBe('pt-BR')
  })

  it('keeps the language of the profile after the session ends', async () => {
    const language = useLanguageStore()
    const auth = useAuthStore()
    auth.session = { ...session, language: 'EN_US' }
    await nextTick()

    auth.session = null
    await nextTick()

    expect(language.locale).toBe('en-US')
  })

  it('saves the choice in the profile and only then switches, with a session', async () => {
    vi.mocked(authApi.changeLanguage).mockResolvedValue({ ...session, language: 'EN_US' })
    const language = useLanguageStore()
    const auth = useAuthStore()
    auth.session = session

    const selecting = language.select('en-US')
    expect(language.locale).toBe('pt-BR')
    await selecting
    await nextTick()

    expect(authApi.changeLanguage).toHaveBeenCalledWith('EN_US')
    expect(auth.session?.language).toBe('EN_US')
    expect(language.locale).toBe('en-US')
    expect(i18n.global.locale.value).toBe('en-US')
  })

  it('does not switch when the profile cannot be saved', async () => {
    vi.mocked(authApi.changeLanguage).mockRejectedValue(new Error('offline'))
    const language = useLanguageStore()
    const auth = useAuthStore()
    auth.session = session

    await expect(language.select('en-US')).rejects.toThrow('offline')

    expect(language.locale).toBe('pt-BR')
    expect(auth.session.language).toBe('PT_BR')
  })

  it('saves in the profile for a pending account too', async () => {
    vi.mocked(authApi.changeLanguage).mockResolvedValue({
      ...session,
      status: 'PENDING',
      language: 'EN_US',
    })
    const language = useLanguageStore()
    useAuthStore().session = { ...session, status: 'PENDING' }

    await language.select('en-US')

    expect(authApi.changeLanguage).toHaveBeenCalledWith('EN_US')
  })
})
