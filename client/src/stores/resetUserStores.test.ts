import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAccountStore } from './account'
import { useCardsStore } from './cards'
import { useClassificationsStore } from './classifications'
import { useCostCentersStore } from './costCenters'
import { useFinancialPeriodsStore } from './financialPeriods'
import { useTrustedDevicesStore } from './trustedDevices'
import { useUsersAdminStore } from './usersAdmin'
import { resetUserStores } from './resetUserStores'
import { useWalletsStore } from './wallets'

vi.mock('@/api/accounts')
vi.mock('@/api/auth')
vi.mock('@/api/cards')
vi.mock('@/api/classifications')
vi.mock('@/api/costCenters')
vi.mock('@/api/financialPeriods')
vi.mock('@/api/roles')
vi.mock('@/api/users')
vi.mock('@/api/wallets')

describe('resetUserStores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('resets every store that holds user data', () => {
    const stores = [
      useAccountStore(),
      useWalletsStore(),
      useCardsStore(),
      useCostCentersStore(),
      useClassificationsStore(),
      useFinancialPeriodsStore(),
      useUsersAdminStore(),
      useTrustedDevicesStore(),
    ]
    const resets = stores.map((store) => vi.spyOn(store, 'reset'))

    resetUserStores()

    for (const reset of resets) {
      expect(reset).toHaveBeenCalledOnce()
    }
  })

  it('clears what a previous user left in the stores', () => {
    const wallets = useWalletsStore()
    const periods = useFinancialPeriodsStore()
    wallets.pageResponse.content = [
      { id: 'w-1', name: 'Main', type: 'PERSONAL', bank: null, active: true },
    ]
    periods.pageRequest.status = 'ALL'

    resetUserStores()

    expect(wallets.pageResponse.content).toEqual([])
    expect(periods.pageRequest.status).toBe('OPEN')
  })
})
