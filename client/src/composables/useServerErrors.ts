import { computed, ref } from 'vue'
import i18n from '@/locales'
import { describeApiError } from '@/utils/apiErrorNotice'
import { markHandled } from '@/utils/handledErrors'

export function useServerErrors() {
  const messages = ref<string[]>([])
  const fields = ref<string[]>([])
  const fieldMessages = ref<Record<string, string>>({})
  const generalMessages = computed(() =>
    messages.value.filter((message) => !Object.values(fieldMessages.value).includes(message)),
  )

  function clearFields() {
    fields.value = []
  }

  function clear() {
    messages.value = []
    fields.value = []
    fieldMessages.value = {}
  }

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    clear()
    try {
      await action()
      return true
    } catch (error) {
      markHandled(error)
      const notice = describeApiError(error)
      const translated = (notice?.details ?? []).map(({ key, params, field }) => ({
        field,
        text: i18n.global.t(key, params ?? {}),
      }))
      messages.value = translated.map(({ text }) => text)
      fields.value = translated.flatMap(({ field }) => (field === undefined ? [] : [field]))
      fieldMessages.value = Object.fromEntries(
        translated.flatMap(({ field, text }) => (field === undefined ? [] : [[field, text]])),
      )
      return false
    }
  }

  return { messages, fields, fieldMessages, generalMessages, clear, clearFields, run }
}
