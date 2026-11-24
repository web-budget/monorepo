import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { invoicesApi } from '@/api/invoices'
import { movementsApi } from '@/api/movements'
import { periodResultsApi } from '@/api/periodResults'
import type {
  AccumulatedView,
  ClosingSummaryView,
  FinancialPeriodResultView,
  InvoiceView,
  MovementListView,
} from '@/types'

const PENDING_PAGE_SIZE = 100

export const usePeriodClosingStore = defineStore('periodClosing', () => {
  const summary = ref<ClosingSummaryView | null>(null)
  const result = ref<FinancialPeriodResultView | null>(null)
  const accumulated = ref<AccumulatedView | null>(null)
  const pendencies = ref<MovementListView[]>([])
  const invoicePaymentIds = ref<string[]>([])
  const invoices = ref<InvoiceView[]>([])
  const pending = ref(0)
  const loading = computed(() => pending.value > 0)

  async function track<T>(operation: () => Promise<T>): Promise<T> {
    pending.value++
    try {
      return await operation()
    } finally {
      pending.value--
    }
  }

  function load(financialPeriod: string): Promise<void> {
    return track(async () => {
      const openMovements = {
        statuses: ['OPEN' as const],
        financialPeriods: [financialPeriod],
        size: PENDING_PAGE_SIZE,
      }
      const [loadedSummary, loadedResult, loadedAccumulated, openPage, paymentPage, invoicePage] =
        await Promise.all([
          financialPeriodsApi.findClosing(financialPeriod),
          financialPeriodsApi.findResult(financialPeriod),
          periodResultsApi.findAccumulated(),
          movementsApi.findAll({ ...openMovements, sort: 'dueDate,asc' }),
          movementsApi.findAll({ ...openMovements, invoicePayments: true }),
          invoicesApi.findAll({ financialPeriod, size: PENDING_PAGE_SIZE }),
        ])
      summary.value = loadedSummary
      result.value = loadedResult
      accumulated.value = loadedAccumulated
      pendencies.value = openPage.content
      invoicePaymentIds.value = paymentPage.content.map((movement) => movement.id)
      invoices.value = invoicePage.content
    })
  }

  function move(id: string, financialPeriod: string) {
    return track(() => movementsApi.move(id, financialPeriod))
  }

  function close(financialPeriod: string) {
    return track(() => financialPeriodsApi.close(financialPeriod))
  }

  function closeInvoice(id: string) {
    return track(() => invoicesApi.close(id))
  }

  function reset() {
    summary.value = null
    result.value = null
    accumulated.value = null
    pendencies.value = []
    invoicePaymentIds.value = []
    invoices.value = []
  }

  return {
    summary,
    result,
    accumulated,
    pendencies,
    invoicePaymentIds,
    invoices,
    loading,
    load,
    move,
    close,
    closeInvoice,
    reset,
  }
})
