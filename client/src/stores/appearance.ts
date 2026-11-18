import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'webbudget.appearance'

function readStoredDark(): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { dark?: unknown }
    return stored.dark === true
  } catch {
    return false
  }
}

function persist(dark: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dark }))
  } catch {
    return
  }
}

export const useAppearanceStore = defineStore('appearance', () => {
  const dark = ref(readStoredDark())

  function toggleDark() {
    dark.value = !dark.value
  }

  watch(
    dark,
    (value) => {
      document.documentElement.classList.toggle('dark', value)
      persist(value)
    },
    { immediate: true },
  )

  return { dark, toggleDark }
})
