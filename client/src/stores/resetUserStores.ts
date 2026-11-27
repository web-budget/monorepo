import { useAccountStore } from '@/stores/account'
import { useCardPurchasesStore } from '@/stores/cardPurchases'
import { useCardsStore } from '@/stores/cards'
import { useClassificationsStore } from '@/stores/classifications'
import { useCompartmentsStore } from '@/stores/compartments'
import { useCompositionStore } from '@/stores/composition'
import { useCostCentersStore } from '@/stores/costCenters'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'
import { useImportsStore } from '@/stores/imports'
import { useInvoicesStore } from '@/stores/invoices'
import { useMovementsStore } from '@/stores/movements'
import { useOverviewStore } from '@/stores/overview'
import { usePeriodClosingStore } from '@/stores/periodClosing'
import { usePeriodDashboardStore } from '@/stores/periodDashboard'
import { useRecurringLaunchStore } from '@/stores/recurringLaunch'
import { useRecurringMovementsStore } from '@/stores/recurringMovements'
import { useSettingsStore } from '@/stores/settings'
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
  useCompartmentsStore().reset()
  useCompositionStore().reset()
  useOverviewStore().reset()
  useFinancialPeriodsStore().reset()
  useImportsStore().reset()
  useInvoicesStore().reset()
  useMovementsStore().reset()
  usePeriodClosingStore().reset()
  usePeriodDashboardStore().reset()
  useRecurringLaunchStore().reset()
  useRecurringMovementsStore().reset()
  useSettingsStore().reset()
  useStatementStore().reset()
  useTransfersStore().reset()
  useUsersAdminStore().reset()
  useTrustedDevicesStore().reset()
}
