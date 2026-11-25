import { ref } from 'vue'
import i18n from '@/locales'
import { describeApiError } from '@/utils/apiErrorNotice'
import { markHandled } from '@/utils/handledErrors'

export function useServerErrors() {
  const messages = ref<string[]>([])
  const fields = ref<string[]>([])

  function clearFields() {
    fields.value = []
  }

  function clear() {
    messages.value = []
    fields.value = []
  }

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    messages.value = []
    fields.value = []
    try {
      await action()
      return true
    } catch (error) {
      markHandled(error)
      const notice = describeApiError(error)
      const details = notice?.details ?? []
      messages.value = details.map(({ key, params }) => i18n.global.t(key, params ?? {}))
      fields.value = details.flatMap(({ field }) => (field === undefined ? [] : [field]))
      return false
    }
  }

  return { messages, fields, clear, clearFields, run }
}
