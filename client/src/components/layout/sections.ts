import {
  ArrowRightLeft,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  ChartLine,
  CreditCard,
  Network,
  RefreshCw,
  Tags,
  Users,
  Wallet,
} from 'lucide-vue-next'
import type { MenuGroup } from '@/components/layout/menu'
import type { Role } from '@/types'

export interface SectionDefinition extends MenuGroup {
  path: string
  role: Role
}

export const dashboardsSection: SectionDefinition = {
  path: '/dashboards',
  label: 'menu.dashboards',
  role: 'DASHBOARDS',
  items: [{ label: 'dashboards.overview', icon: ChartColumn }],
}

export const financialSection: SectionDefinition = {
  path: '/financial',
  label: 'menu.financial',
  role: 'FINANCIAL',
  items: [
    { label: 'period-movement.menu', icon: CalendarDays },
    { label: 'recurrent-movement.menu', icon: RefreshCw },
    { label: 'credit-card-invoice.menu', icon: CreditCard },
    { label: 'period-closing.menu', icon: ChartLine },
  ],
}

export const registrationSection: SectionDefinition = {
  path: '/registration',
  label: 'menu.registration',
  role: 'REGISTRATION',
  items: [
    { label: 'wallet.menu', icon: Wallet, to: '/registration/wallets' },
    { label: 'card.menu', icon: CreditCard, to: '/registration/cards' },
    { label: 'classification.menu', icon: Tags, to: '/registration/classifications' },
    { label: 'cost-center.menu', icon: Network, to: '/registration/cost-centers' },
    { label: 'financial-period.menu', icon: CalendarRange, to: '/registration/financial-periods' },
  ],
}

export const configurationSection: SectionDefinition = {
  path: '/configuration',
  label: 'menu.configuration',
  role: 'ADMINISTRATION',
  items: [
    { label: 'users.menu', icon: Users, to: '/configuration/users' },
    { label: 'integrations.menu', icon: ArrowRightLeft },
  ],
}

export const sections: SectionDefinition[] = [
  dashboardsSection,
  financialSection,
  registrationSection,
  configurationSection,
]
