import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useTransfersStore } from '@/stores/transfers'
import type { TransferView } from '@/types'

export function useGiveBack() {
  const router = useRouter()
  const store = useTransfersStore()
  const { balanceOf } = useActiveWallets()
  const { showSuccess } = useNotification()
  const { messages, clear, run } = useServerErrors()

  const target = ref<TransferView | null>(null)

  function open(transfer: TransferView) {
    clear()
    target.value = transfer
  }

  function close() {
    target.value = null
  }

  async function confirm(transfer: TransferView) {
    let createdId = ''
    if (await run(async () => (createdId = await store.giveBack(transfer.id)))) {
      close()
      showSuccess('transfer.toast.returned', 'transfer.toast.returned-detail')
      await router.push({ name: 'transfers.detail', params: { id: createdId } })
    }
  }

  return { messages, target, balanceOf, open, close, confirm }
}
