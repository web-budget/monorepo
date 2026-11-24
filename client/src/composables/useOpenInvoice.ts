import { ref } from 'vue'
import { invoicesApi } from '@/api/invoices'
import type { InvoiceView } from '@/types'

export function useOpenInvoice() {
  const missing = ref(false)
  const existing = ref<InvoiceView | null>(null)

  async function check(
    card: string | null | undefined,
    financialPeriod: string | null | undefined,
  ) {
    existing.value = null
    if (!card || !financialPeriod) {
      missing.value = false
      return
    }
    try {
      const page = await invoicesApi.findAll({
        card,
        financialPeriod,
        statuses: ['OPEN'],
        size: 1,
      })
      missing.value = page.page.totalElements === 0
      if (missing.value) {
        const found = await invoicesApi.findAll({ card, financialPeriod, size: 1 })
        existing.value = found.content[0] ?? null
      }
    } catch {
      missing.value = false
    }
  }

  return { missing, existing, check }
}
