import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi } from '@/api/settings'
import type { InstanceSettingsForm, InstanceSettingsView } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<InstanceSettingsView | null>(null)
  const loading = ref(false)

  async function track(operation: () => Promise<InstanceSettingsView>) {
    loading.value = true
    try {
      const result = await operation()
      settings.value = result
      return result
    } finally {
      loading.value = false
    }
  }

  function find() {
    return track(() => settingsApi.find())
  }

  function update(form: InstanceSettingsForm) {
    return track(() => settingsApi.update(form))
  }

  function reset() {
    settings.value = null
    loading.value = false
  }

  return { settings, loading, find, update, reset }
})
