import { useAccountStore } from '@/stores/account'
import { useCardPurchasesStore } from '@/stores/cardPurchases'
import { useCardsStore } from '@/stores/cards'
import { useClassificationsStore } from '@/stores/classifications'
import { useCostCentersStore } from '@/stores/costCenters'
import { useFinancialFlowStore } from '@/stores/financialFlow'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'
import { useInvoicesStore } from '@/stores/invoices'
import { useMovementsStore } from '@/stores/movements'
import { usePeriodClosingStore } from '@/stores/periodClosing'
import { useRecurringLaunchStore } from '@/stores/recurringLaunch'
import { useRecurringMovementsStore } from '@/stores/recurringMovements'
import { useStatementStore } from '@/stores/statement'
import { useTransfersStore } from '@/stores/transfers'
import { useTrustedDevicesStore } from '@/stores/trustedDevices'
import { useUsersAdminStore } from '@/stores/usersAdmin'
import { useWalletsStore } from '@/stores/wallets'

export function resetUserStores() {
  useAccountStore().reset()
  useWalletsStore().reset()
  useCardsStore().reset()
  useCardPurchasesStore().reset()
  useCostCentersStore().reset()
  useClassificationsStore().reset()
  useFinancialFlowStore().reset()
  useFinancialPeriodsStore().reset()
  useInvoicesStore().reset()
  useMovementsStore().reset()
  usePeriodClosingStore().reset()
  useRecurringLaunchStore().reset()
  useRecurringMovementsStore().reset()
  useStatementStore().reset()
  useTransfersStore().reset()
  useUsersAdminStore().reset()
  useTrustedDevicesStore().reset()
}
