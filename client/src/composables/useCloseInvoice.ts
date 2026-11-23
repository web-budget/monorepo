import { computed, ref } from 'vue'
import { cardPurchasesApi } from '@/api/cardPurchases'
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

export function useCloseInvoice(reload: () => Promise<unknown> | unknown) {
  const store = usePeriodClosingStore()
  const { showSuccess } = useNotification()
  const { messages, run } = useServerErrors()

  const target = ref<{ invoice: ClosingInvoiceView; period: ClosablePeriod } | null>(null)
  const purchases = ref(0)
  const card = ref<CardView | null>(null)

  const dueDate = computed(() =>
    card.value && target.value
      ? invoicePaymentDueDate(target.value.period.endingAt, card.value.invoicePaymentDay)
      : null,
  )

  async function open(invoice: ClosingInvoiceView, period: ClosablePeriod) {
    await run(async () => {
      const [purchasePage, found] = await Promise.all([
        cardPurchasesApi.findAll({ invoice: invoice.id, size: 1 }),
        cardsApi.findById(invoice.card.id),
      ])
      purchases.value = purchasePage.page.totalElements
      card.value = found
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
