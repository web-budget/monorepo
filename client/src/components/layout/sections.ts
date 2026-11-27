import {
  ArrowLeftRight,
  ArrowRightLeft,
  CalendarRange,
  ChartBarBig,
  CreditCard,
  Gauge,
  Lock,
  Network,
  ReceiptText,
  RefreshCw,
  ScrollText,
  SlidersHorizontal,
  Tags,
  Users,
  Wallet,
} from 'lucide-vue-next'
import type { MenuGroup, MenuItemDefinition } from '@/components/layout/menu'
import type { Role } from '@/types'

export interface SectionDefinition extends MenuGroup {
  path: string
  role: Role
}

export interface ModuleItemDefinition extends MenuItemDefinition {
  description: string
}

export interface ModuleSectionDefinition extends SectionDefinition {
  items: ModuleItemDefinition[]
}

export const dashboardsSection: SectionDefinition = {
  path: '/dashboards',
  label: 'menu.dashboards',
  role: 'DASHBOARDS',
  items: [
    { label: 'overview.menu', icon: Gauge, to: '/dashboards/overview' },
    { label: 'period-dashboard.menu', icon: CalendarRange, to: '/dashboards/period' },
    { label: 'composition.menu', icon: ChartBarBig },
  ],
}

export const financialSection: ModuleSectionDefinition = {
  path: '/financial',
  label: 'menu.financial',
  role: 'FINANCIAL',
  items: [
    {
      label: 'movement.menu',
      icon: ReceiptText,
      to: '/financial/movements',
      description: 'module-home.items.movement',
      group: 'menu.financial-daily',
    },
    {
      label: 'transfer.menu',
      icon: ArrowLeftRight,
      to: '/financial/transfers',
      description: 'module-home.items.transfer',
    },
    {
      label: 'statement.menu',
      icon: ScrollText,
      to: '/financial/statement',
      description: 'module-home.items.statement',
    },
    {
      label: 'recurrent-movement.menu',
      icon: RefreshCw,
      to: '/financial/recurring-movements',
      description: 'module-home.items.recurrent-movement',
    },
    {
      label: 'credit-card-invoice.menu',
      icon: CreditCard,
      to: '/financial/invoices',
      description: 'module-home.items.credit-card-invoice',
    },
    {
      label: 'financial-period.menu',
      icon: CalendarRange,
      to: '/financial/periods',
      description: 'module-home.items.financial-period',
      group: 'menu.financial-period',
    },
    {
      label: 'period-closing.menu',
      icon: Lock,
      to: '/financial/closing',
      description: 'module-home.items.period-closing',
    },
  ],
}

export const registrationSection: ModuleSectionDefinition = {
  path: '/registration',
  label: 'menu.registration',
  role: 'REGISTRATION',
  items: [
    {
      label: 'wallet.menu',
      icon: Wallet,
      to: '/registration/wallets',
      description: 'module-home.items.wallet',
    },
    {
      label: 'card.menu',
      icon: CreditCard,
      to: '/registration/cards',
      description: 'module-home.items.card',
    },
    {
      label: 'classification.menu',
      icon: Tags,
      to: '/registration/classifications',
      description: 'module-home.items.classification',
    },
    {
      label: 'cost-center.menu',
      icon: Network,
      to: '/registration/cost-centers',
      description: 'module-home.items.cost-center',
    },
  ],
}

export const configurationSection: ModuleSectionDefinition = {
  path: '/configuration',
  label: 'menu.configuration',
  role: 'ADMINISTRATION',
  items: [
    {
      label: 'users.menu',
      icon: Users,
      to: '/configuration/users',
      description: 'module-home.items.users',
    },
    {
      label: 'settings.menu',
      icon: SlidersHorizontal,
      to: '/configuration/settings',
      description: 'module-home.items.settings',
    },
    {
      label: 'integrations.menu',
      icon: ArrowRightLeft,
      description: 'module-home.items.integrations',
    },
  ],
}

export const sections: SectionDefinition[] = [
  dashboardsSection,
  financialSection,
  registrationSection,
  configurationSection,
]
