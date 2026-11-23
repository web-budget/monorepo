import { ref } from 'vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useMovementsStore } from '@/stores/movements'
import type { MovementType, PaymentForm } from '@/types'
import i18n from '@/locales'

interface MovementTarget {
  id: string
  name: string
  type: MovementType
  value: number
  invoicePayment?: boolean
  suggestedCard?: string | null
}

export function useMovementActions(reload: () => Promise<unknown> | unknown) {
  const store = useMovementsStore()
  const { confirm } = useConfirmDialog()
  const { showSuccess } = useNotification()
  const { messages, run } = useServerErrors()

  const payTarget = ref<MovementTarget | null>(null)

  function openPay(target: MovementTarget) {
    payTarget.value = target
  }

  function closePay() {
    payTarget.value = null
  }

  async function openPayWithSuggestion(target: MovementTarget) {
    await run(async () => {
      openPay({ ...target, suggestedCard: await store.suggestedCardOf(target.id) })
    })
  }

  async function pay(target: MovementTarget, form: PaymentForm) {
    if (await run(() => store.pay(target.id, form))) {
      closePay()
      showSuccess('movement.toast.paid', 'movement.toast.paid-detail', true, { name: target.name })
      await reload()
    }
  }

  async function undoPayment(target: Pick<MovementTarget, 'id' | 'name'>) {
    const { t } = i18n.global
    const confirmed = await confirm({
      destructive: true,
      title: t('movement.undo.title', { name: target.name }),
      description: t('movement.undo.description'),
      confirmLabel: t('movement.undo.confirm'),
    })
    if (confirmed && (await run(() => store.undoPayment(target.id)))) {
      showSuccess('movement.toast.payment-undone', 'movement.toast.payment-undone-detail', true, {
        name: target.name,
      })
      await reload()
    }
  }

  return { messages, payTarget, openPay, openPayWithSuggestion, closePay, pay, undoPayment }
}
