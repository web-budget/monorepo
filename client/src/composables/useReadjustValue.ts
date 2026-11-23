import { ref } from 'vue'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useRecurringMovementsStore } from '@/stores/recurringMovements'
import type { RecurringValueForm } from '@/types'

interface ReadjustTarget {
  id: string
  name: string
  value: number
}

export function useReadjustValue(reload: () => Promise<unknown> | unknown) {
  const store = useRecurringMovementsStore()
  const { showSuccess } = useNotification()
  const { messages, run } = useServerErrors()

  const target = ref<ReadjustTarget | null>(null)

  function open({ id, name, value }: ReadjustTarget) {
    target.value = { id, name, value }
  }

  function close() {
    target.value = null
  }

  async function confirm(recurringMovement: ReadjustTarget, form: RecurringValueForm) {
    if (await run(() => store.readjust(recurringMovement.id, form))) {
      close()
      showSuccess(
        'recurrent-movement.toast.readjusted',
        'recurrent-movement.toast.readjusted-detail',
        true,
        { name: recurringMovement.name },
      )
      await reload()
    }
  }

  return { messages, target, open, close, confirm }
}
