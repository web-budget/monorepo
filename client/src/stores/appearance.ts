import { usePreferredDark } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'webbudget.appearance'

export type ThemeMode = 'light' | 'dark' | 'system'

export const themeModes: ThemeMode[] = ['light', 'dark', 'system']

function isThemeMode(value: unknown): value is ThemeMode {
  return themeModes.includes(value as ThemeMode)
}

function readStoredMode(): ThemeMode {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {
      mode?: unknown
      dark?: unknown
    } | null
    if (isThemeMode(stored?.mode)) {
      return stored.mode
    }
    return stored?.dark === true ? 'dark' : 'system'
  } catch {
    return 'system'
  }
}

function persist(mode: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode }))
  } catch {
    return
  }
}

export const useAppearanceStore = defineStore('appearance', () => {
  const mode = ref<ThemeMode>(readStoredMode())
  const systemDark = usePreferredDark()
  const dark = computed(
    () => mode.value === 'dark' || (mode.value === 'system' && systemDark.value),
  )

  function setMode(value: ThemeMode) {
    mode.value = value
    persist(value)
  }

  watch(
    dark,
    (value) => {
      document.documentElement.classList.toggle('dark', value)
    },
    { immediate: true },
  )

  return { mode, dark, setMode }
})
