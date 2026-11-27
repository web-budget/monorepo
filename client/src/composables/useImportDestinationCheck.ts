import { ref, watch, type Ref } from 'vue'
import { importsApi } from '@/api/imports'
import { invoicesApi } from '@/api/invoices'
import type { ImportListView, ImportTarget } from '@/types'

interface Destination {
  target: Ref<ImportTarget>
  card: Ref<string>
  wallet: Ref<string>
  financialPeriod: Ref<string>
}

export function useImportDestinationCheck(destination: Destination) {
  const withoutOpenInvoice = ref(false)
  const draft = ref<ImportListView | null>(null)

  async function check() {
    const { target, card, wallet, financialPeriod } = destination
    const chosen = target.value === 'CARD' ? card.value : wallet.value
    if (!chosen || !financialPeriod.value) {
      withoutOpenInvoice.value = false
      draft.value = null
      return
    }
    const [invoices, drafts] = await Promise.all([
      target.value === 'CARD'
        ? invoicesApi.findAll({
            card: chosen,
            financialPeriod: financialPeriod.value,
            statuses: ['OPEN'],
            size: 1,
          })
        : null,
      importsApi.findAll({
        statuses: ['PROCESSING', 'READY'],
        card: target.value === 'CARD' ? chosen : undefined,
        wallet: target.value === 'WALLET' ? chosen : undefined,
        financialPeriod: financialPeriod.value,
        size: 1,
      }),
    ])
    withoutOpenInvoice.value = invoices !== null && invoices.page.totalElements === 0
    draft.value = drafts.content[0] ?? null
  }

  watch(
    [destination.target, destination.card, destination.wallet, destination.financialPeriod],
    check,
    { immediate: true },
  )

  return { withoutOpenInvoice, draft, check }
}
