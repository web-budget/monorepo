import { describe, expect, it, vi } from 'vitest'
import { walletsApi } from '@/api/wallets'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { pageOf } from '@/test/crud'
import type { WalletView } from '@/types'

vi.mock('@/api/wallets')

describe('useActiveWallets', () => {
  it('loads the active wallets by name', async () => {
    vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf([{ id: 'w-1' }] as never[]))
    const active = useActiveWallets()

    await active.load()

    expect(active.wallets.value).toEqual([{ id: 'w-1' }])
    expect(walletsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'name,asc' }),
    )
  })

  it('reads the balance of a wallet', async () => {
    vi.mocked(walletsApi.findById).mockResolvedValue({ currentBalance: 1234.5 } as WalletView)

    await expect(useActiveWallets().balanceOf('w-1')).resolves.toBe(1234.5)
  })
})
