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
      const details = notice?.details ?? []
      const translated = details.map(({ key, params }) => i18n.global.t(key, params ?? {}))
      messages.value = translated
      fields.value = details.flatMap(({ field }) => (field === undefined ? [] : [field]))
      fieldMessages.value = Object.fromEntries(
        details.flatMap(({ field }, index) =>
          field === undefined ? [] : [[field, translated[index] ?? '']],
        ),
      )
      return false
    }
  }

  return { messages, fields, fieldMessages, generalMessages, clear, clearFields, run }
}
