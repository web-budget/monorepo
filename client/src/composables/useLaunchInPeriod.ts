import { ref } from 'vue'
import { useNotification } from '@/composables/useNotification'
import { useOpenPeriods } from '@/composables/useOpenPeriods'
import { useServerErrors } from '@/composables/useServerErrors'
import { useRecurringMovementsStore } from '@/stores/recurringMovements'
import type { RecurringExtraLaunchForm, RecurringMovementView } from '@/types'

export function useLaunchInPeriod(reload: () => Promise<unknown> | unknown) {
  const store = useRecurringMovementsStore()
  const { showSuccess } = useNotification()
  const { messages, clear, run } = useServerErrors()
  const openPeriods = useOpenPeriods()

  const target = ref<RecurringMovementView | null>(null)

  async function open(recurringMovement: RecurringMovementView) {
    clear()
    target.value = recurringMovement
    await run(openPeriods.load)
  }

  function close() {
    target.value = null
  }

  async function confirm(recurringMovement: RecurringMovementView, form: RecurringExtraLaunchForm) {
    let created = 0
    const succeeded = await run(async () => {
      const report = await store.launchExtra(recurringMovement.id, form)
      created = report.launched.length
    })
    if (!succeeded) {
      return
    }
    const period = openPeriods.periods.value.find((item) => item.id === form.financialPeriod)
    close()
    showSuccess(
      'recurrent-movement.toast.extra-launched',
      'recurrent-movement.toast.launched-detail',
      true,
      { count: created, period: period?.name },
    )
    await reload()
  }

  return { messages, target, periods: openPeriods.periods, open, close, confirm }
}
