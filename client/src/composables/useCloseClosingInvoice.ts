import { computed, ref } from 'vue'
import { cardsApi } from '@/api/cards'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import i18n from '@/locales'
import { usePeriodClosingStore } from '@/stores/periodClosing'
import type { CardView, ClosingInvoiceView } from '@/types'
import { invoicePaymentDueDate } from '@/utils/invoices'

interface ClosablePeriod {
  name: string
  endingAt: string
}

export function useCloseClosingInvoice(reload: () => Promise<unknown> | unknown) {
  const store = usePeriodClosingStore()
  const { showSuccess } = useNotification()
  const { messages, run } = useServerErrors()

  const target = ref<{ invoice: ClosingInvoiceView; period: ClosablePeriod } | null>(null)
  const card = ref<CardView | null>(null)
  const purchases = computed(() => target.value?.invoice.purchaseCount ?? 0)

  const dueDate = computed(() =>
    card.value && target.value
      ? invoicePaymentDueDate(target.value.period.endingAt, card.value.invoicePaymentDay)
      : null,
  )

  async function open(invoice: ClosingInvoiceView, period: ClosablePeriod) {
    await run(async () => {
      card.value = await cardsApi.findById(invoice.card.id)
      target.value = { invoice, period }
    })
  }

  function close() {
    target.value = null
  }

  async function confirm() {
    const current = target.value!
    if (await run(() => store.closeInvoice(current.invoice.id))) {
      close()
      showSuccess(
        'credit-card-invoice.toast.closed',
        'credit-card-invoice.toast.closed-detail',
        true,
        { value: i18n.global.n(current.invoice.value, 'currency') },
      )
      await reload()
    }
  }

  return { messages, target, purchases, card, dueDate, open, close, confirm }
}
