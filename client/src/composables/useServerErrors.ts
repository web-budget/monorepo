import { ref } from 'vue'
import i18n from '@/locales'
import { describeApiError } from '@/utils/apiErrorNotice'

export function useServerErrors() {
  const messages = ref<string[]>([])

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    messages.value = []
    try {
      await action()
      return true
    } catch (error) {
      const notice = describeApiError(error)
      messages.value = (notice?.details ?? []).map(({ key, params }) =>
        i18n.global.t(key, params ?? {}),
      )
      return false
    }
  }

  return { messages, run }
}
