import type { OverviewReliability, OverviewView } from '@/types'

export const reliability: OverviewReliability = {
  accumulated: 5000,
  balancesTotal: 5300,
  walletCount: 3,
  difference: 300,
  adjustmentsTotal: 300,
  residue: 0,
  adjustments: { count: 2, credited: 400, debited: 100 },
  generic: {
    value: 150,
    total: 1000,
    classifications: [
      { id: 'c-1', name: 'Outras despesas' },
      { id: 'c-2', name: 'Diversos' },
    ],
  },
}

export const overviewExtras: Pick<
  OverviewView,
  'accumulated' | 'costOfLiving' | 'reserve' | 'reliability'
> = {
  accumulated: 5000,
  costOfLiving: { value: 2000, basedOn: 12 },
  reserve: { current: 6000, months: 6, ideal: 12000 },
  reliability,
}
