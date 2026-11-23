import { ref } from 'vue'
import { walletsApi } from '@/api/wallets'
import type { WalletListView } from '@/types'

const WALLETS_PAGE_SIZE = 100

export function useActiveWallets() {
  const wallets = ref<WalletListView[]>([])

  async function load() {
    const page = await walletsApi.findAll({
      status: 'ACTIVE',
      size: WALLETS_PAGE_SIZE,
      sort: 'name,asc',
    })
    wallets.value = page.content
  }

  async function balanceOf(id: string): Promise<number> {
    return (await walletsApi.findById(id)).currentBalance
  }

  return { wallets, load, balanceOf }
}
