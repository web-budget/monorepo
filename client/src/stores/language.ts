import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import i18n from '@/locales'
import {
  detectBrowserLocale,
  isSupportedLocale,
  LANGUAGE_LOCALES,
  LOCALE_LANGUAGES,
  type SupportedLocale,
} from '@/locales/languages'
import { useAuthStore } from '@/stores/auth'

const STORAGE_KEY = 'webbudget.language'

function readStoredLocale(): SupportedLocale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isSupportedLocale(stored) ? stored : null
  } catch {
    return null
  }
}

function persist(locale: SupportedLocale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    return
  }
}

function browserLocale(): SupportedLocale {
  return detectBrowserLocale(navigator.languages ?? [navigator.language])
}

export const useLanguageStore = defineStore('language', () => {
  const auth = useAuthStore()
  const locale = ref<SupportedLocale>(readStoredLocale() ?? browserLocale())

  function adopt(next: SupportedLocale) {
    locale.value = next
    persist(next)
  }

  async function select(next: SupportedLocale): Promise<void> {
    if (auth.isAuthenticated) {
      await auth.changeLanguage(LOCALE_LANGUAGES[next])
    } else {
      adopt(next)
    }
  }

  watch(
    () => auth.session?.language,
    (language) => {
      const profileLocale = language === undefined ? undefined : LANGUAGE_LOCALES[language]
      if (profileLocale !== undefined) {
        adopt(profileLocale)
      }
    },
    { immediate: true },
  )

  watch(
    locale,
    (value) => {
      i18n.global.locale.value = value
      document.documentElement.lang = value
    },
    { immediate: true },
  )

  return { locale, select }
})
