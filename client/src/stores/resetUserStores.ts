import { useAccountStore } from '@/stores/account'
import { useCardsStore } from '@/stores/cards'
import { useClassificationsStore } from '@/stores/classifications'
import { useCostCentersStore } from '@/stores/costCenters'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'
import { useWalletsStore } from '@/stores/wallets'

export function resetUserStores() {
  useAccountStore().reset()
  useWalletsStore().reset()
  useCardsStore().reset()
  useCostCentersStore().reset()
  useClassificationsStore().reset()
  useFinancialPeriodsStore().reset()
}
