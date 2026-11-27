import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useStatementStore } from '@/stores/statement'
import type { ReconciliationForm, ReconciliationResultView, WalletType } from '@/types'
import { markHandled } from '@/utils/handledErrors'
import { balanceChangeOf, reconciliationNotice, type BalanceChange } from '@/utils/reconciliation'

export interface ReconcilableWallet {
  id: string
  name: string
  personal: boolean
  balance: number
}

export function useReconciliation(reload: () => Promise<unknown>) {
  const { n } = useI18n()
  const statement = useStatementStore()
  const { showSuccess } = useNotification()
  const errors = useServerErrors()
  const target = ref<ReconcilableWallet | null>(null)
  const balanceChange = ref<BalanceChange | null>(null)

  function open(wallet: { id: string; name: string; type: WalletType }, balance: number) {
    errors.clear()
    balanceChange.value = null
    target.value = {
      id: wallet.id,
      name: wallet.name,
      personal: wallet.type === 'PERSONAL',
      balance,
    }
  }

  function close() {
    target.value = null
  }

  async function reconcile(wallet: ReconcilableWallet, form: ReconciliationForm) {
    balanceChange.value = null
    errors.clear()
    let result: ReconciliationResultView
    try {
      result = await statement.reconcile(wallet.id, form)
    } catch (error) {
      const change = balanceChangeOf(error)
      if (change) {
        markHandled(error)
        target.value = { ...wallet, balance: change.balance }
        balanceChange.value = change
      } else {
        await errors.run(() => Promise.reject(error))
      }
      return
    }
    target.value = null
    const notice = reconciliationNotice(result.reconciliation.difference, wallet.name, n)
    showSuccess('wallet.reconcile.toast.title', notice.detail, true, notice.params)
    await reload()
  }

  return {
    target,
    balanceChange,
    messages: errors.messages,
    loading: computed(() => statement.loading),
    open,
    close,
    reconcile,
  }
}
