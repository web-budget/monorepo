import { ref } from 'vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useMovementsStore } from '@/stores/movements'
import type { MovementType, MovementView, PaymentForm } from '@/types'
import i18n from '@/locales'

interface MovementTarget {
  id: string
  name: string
  type: MovementType
  value: number
  invoicePayment?: boolean
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

  async function undoPayment(target: Pick<MovementTarget, 'id' | 'name'>) {
    const { t } = i18n.global
    const confirmed = await confirm({
      destructive: true,
      title: t('movement.undo.title', { name: target.name }),
      description: t('movement.undo.description'),
      confirmLabel: t('movement.undo.confirm'),
    })
    if (confirmed && (await run(() => store.undoPayment(target.id)))) {
      showSuccess('movement.toast.payment-undone', 'movement.toast.payment-undone-detail')
      await reload()
    }
  }

  return { messages, payTarget, openPay, closePay, pay, undoPayment }
}
