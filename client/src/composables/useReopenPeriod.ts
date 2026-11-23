import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import i18n from '@/locales'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'

export function useReopenPeriod(reload: () => Promise<unknown> | unknown) {
  const store = useFinancialPeriodsStore()
  const { confirm } = useConfirmDialog()
  const { showSuccess } = useNotification()
  const { messages, run } = useServerErrors()

  async function reopen(period: { id: string; name: string }) {
    const { t } = i18n.global
    const confirmed = await confirm({
      title: t('period-closing.reopen.title', { name: period.name }),
      description: t('period-closing.reopen.description'),
      confirmLabel: t('period-closing.reopen.confirm'),
    })
    if (confirmed && (await run(() => store.reopen(period.id)))) {
      showSuccess('period-closing.toast.reopened', undefined, true)
      await reload()
    }
  }

  return { messages, reopen }
}
