import { computed, ref } from 'vue'
import { cardsApi } from '@/api/cards'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import i18n from '@/locales'
import { useInvoicesStore } from '@/stores/invoices'
import type { CardView, FinancialPeriodView, InvoiceView } from '@/types'
import { invoicePaymentDueDate, periodMonth } from '@/utils/invoices'

function formatBare(value: number): string {
  return i18n.global.n(value, 'currency').replace(/^R\$\s*/, '')
}

export function useCloseInvoice(onClosed: () => Promise<unknown> | unknown) {
  const store = useInvoicesStore()
  const { showSuccess } = useNotification()
  const { messages, run } = useServerErrors()
  const closeErrors = useServerErrors()

  const target = ref<InvoiceView | null>(null)
  const card = ref<CardView | null>(null)
  const period = ref<FinancialPeriodView | null>(null)

  const dueDate = computed(() =>
    card.value && period.value
      ? invoicePaymentDueDate(period.value.endingAt, card.value.invoicePaymentDay)
      : null,
  )
  const title = computed(() =>
    target.value && period.value
      ? i18n.global.t('credit-card-invoice.close.title', {
          period: periodMonth(period.value.name),
          card: target.value.card.name,
        })
      : '',
  )

  async function open(invoice: InvoiceView) {
    closeErrors.clear()
    target.value = invoice
    card.value = null
    period.value = null
    await run(async () => {
      const [loadedCard, loadedPeriod] = await Promise.all([
        cardsApi.findById(invoice.card.id),
        financialPeriodsApi.findById(invoice.financialPeriod.id),
      ])
      card.value = loadedCard
      period.value = loadedPeriod
    })
  }

  function cancel() {
    target.value = null
  }

  async function confirm() {
    const invoice = target.value
    if (invoice && (await closeErrors.run(() => store.close(invoice.id)))) {
      target.value = null
      showSuccess(
        'credit-card-invoice.toast.closed',
        'credit-card-invoice.toast.closed-detail',
        true,
        { value: formatBare(invoice.value) },
      )
      await onClosed()
    }
  }

  const dialog = computed(() => ({
    open: target.value !== null && card.value !== null && period.value !== null,
    title: title.value,
    purchases: target.value?.purchaseCount ?? 0,
    value: target.value?.value ?? 0,
    dueDate: dueDate.value,
    walletName: card.value?.wallet?.name ?? null,
    loading: store.loading,
    messages: closeErrors.messages.value,
  }))

  return { messages, dialog, open, cancel, confirm }
}
