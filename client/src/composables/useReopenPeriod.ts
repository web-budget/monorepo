import { computed, ref } from 'vue'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'

interface ReopenablePeriod {
  id: string
  name: string
}

export function useReopenPeriod(reload: () => Promise<unknown> | unknown) {
  const store = useFinancialPeriodsStore()
  const { showSuccess } = useNotification()
  const { messages, run } = useServerErrors()

  const target = ref<ReopenablePeriod | null>(null)
  const loading = computed(() => store.loading)

  function open(period: ReopenablePeriod) {
    target.value = period
  }

  function close() {
    target.value = null
  }

  async function confirm() {
    const period = target.value!
    if (await run(() => store.reopen(period.id))) {
      close()
      showSuccess('period-closing.toast.reopened', 'period-closing.toast.reopened-detail', true, {
        name: period.name,
      })
      await reload()
    }
  }

  return { messages, target, loading, open, close, confirm }
}
