import { ref } from 'vue'
import { movementsApi } from '@/api/movements'
import type { InvoiceView, MovementView } from '@/types'

const PAYMENTS_PAGE_SIZE = 100

export function useInvoicePayment() {
  const payment = ref<MovementView | null>(null)

  async function load(invoice: InvoiceView) {
    payment.value = null
    if (invoice.status === 'OPEN') {
      return
    }
    const { content } = await movementsApi.findAll({
      invoicePayments: true,
      financialPeriods: [invoice.financialPeriod.id],
      size: PAYMENTS_PAGE_SIZE,
    })
    for (const candidate of content) {
      const movement = await movementsApi.findById(candidate.id)
      if (movement.invoice?.id === invoice.id) {
        payment.value = movement
        return
      }
    }
  }

  return { payment, load }
}
