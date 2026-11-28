import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mailSettingsApi } from '@/api/mailSettings'
import type { MailSettingsForm, MailSettingsView } from '@/types'

export const useMailSettingsStore = defineStore('mailSettings', () => {
  const settings = ref<MailSettingsView | null>(null)
  const loading = ref(false)

  async function track(operation: () => Promise<MailSettingsView>) {
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
    return track(() => mailSettingsApi.find())
  }

  function update(form: MailSettingsForm) {
    return track(() => mailSettingsApi.update(form))
  }

  function updateEnabled(enabled: boolean) {
    return track(() => mailSettingsApi.updateEnabled(enabled))
  }

  function reset() {
    settings.value = null
    loading.value = false
  }

  return { settings, loading, find, update, updateEnabled, reset }
})
