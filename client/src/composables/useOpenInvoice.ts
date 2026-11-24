import { ref } from 'vue'
import { invoicesApi } from '@/api/invoices'

export function useOpenInvoice() {
  const missing = ref(false)

  async function check(
    card: string | null | undefined,
    financialPeriod: string | null | undefined,
  ) {
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
    } catch {
      missing.value = false
    }
  }

  return { missing, check }
}
