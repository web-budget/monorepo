import { useAccountStore } from '@/stores/account'
import { useCardsStore } from '@/stores/cards'
import { useClassificationsStore } from '@/stores/classifications'
import { useCostCentersStore } from '@/stores/costCenters'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'
import { useMovementsStore } from '@/stores/movements'
import { useTrustedDevicesStore } from '@/stores/trustedDevices'
import { useUsersAdminStore } from '@/stores/usersAdmin'
import { useWalletsStore } from '@/stores/wallets'

export function resetUserStores() {
  useAccountStore().reset()
  useWalletsStore().reset()
  useCardsStore().reset()
  useCostCentersStore().reset()
  useClassificationsStore().reset()
  useFinancialPeriodsStore().reset()
  useMovementsStore().reset()
  useUsersAdminStore().reset()
  useTrustedDevicesStore().reset()
}
