import {
  ArrowLeftRight,
  ArrowRightLeft,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  CreditCard,
  History,
  Lock,
  Network,
  ReceiptText,
  RefreshCw,
  ScrollText,
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
    { label: 'dashboards.overview', icon: ChartColumn, to: '/dashboards', exact: true },
    { label: 'dashboards.current-month', icon: CalendarDays, to: '/dashboards/mes-atual' },
    { label: 'dashboards.previous-months', icon: History, to: '/dashboards/meses-anteriores' },
    { label: 'dashboards.by-wallet', icon: Wallet, to: '/dashboards/por-carteira' },
    { label: 'dashboards.by-classification', icon: Tags, to: '/dashboards/por-classificacao' },
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
      description: 'module-home.items.recurrent-movement',
    },
    {
      label: 'credit-card-invoice.menu',
      icon: CreditCard,
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
