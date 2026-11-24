import { ref } from 'vue'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { movementsApi } from '@/api/movements'
import { useMovementsStore } from '@/stores/movements'
import type { MovementType, MovementView, PaymentForm } from '@/types'

interface MovementTarget {
  id: string
  name: string
  type: MovementType
  value: number
  invoicePayment?: boolean
  suggestedCard?: string | null
  financialPeriod?: { id: string; name: string }
}

export function useMovementActions(reload: () => Promise<unknown> | unknown) {
  const store = useMovementsStore()
  const { showSuccess } = useNotification()
  const { messages, run } = useServerErrors()

  const payTarget = ref<MovementTarget | null>(null)
  const undoTarget = ref<MovementView | null>(null)

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
    let paid: MovementView | undefined
    const done = await run(async () => {
      paid = await store.pay(target.id, form)
    })
    if (done) {
      closePay()
      const income = target.type === 'INCOME'
      const onCard = paid?.payment?.card != null
      showSuccess(
        income ? 'movement.toast.received' : 'movement.toast.paid',
        onCard
          ? 'movement.toast.paid-on-card-detail'
          : income
            ? 'movement.toast.received-detail'
            : 'movement.toast.paid-detail',
        true,
        { wallet: paid?.payment?.wallet?.name, card: paid?.payment?.card?.name },
      )
      await reload()
    }
  }

  async function openUndo(target: Pick<MovementTarget, 'id'>) {
    await run(async () => {
      undoTarget.value = await movementsApi.findById(target.id)
    })
  }

  function closeUndo() {
    undoTarget.value = null
  }

  async function undoPayment(target: MovementView) {
    if (await run(() => store.undoPayment(target.id))) {
      closeUndo()
      showSuccess('movement.toast.payment-undone', 'movement.toast.payment-undone-detail')
      await reload()
    }
  }

  return {
    messages,
    payTarget,
    undoTarget,
    openPay,
    openPayWithSuggestion,
    closePay,
    pay,
    openUndo,
    closeUndo,
    undoPayment,
  }
}
