<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { importsApi } from '@/api/imports'
import { invoicesApi } from '@/api/invoices'
import { movementsApi } from '@/api/movements'
import { recurringMovementsApi } from '@/api/recurringMovements'
import { transfersApi } from '@/api/transfers'
import ModuleHome from '@/components/layout/ModuleHome.vue'
import { financialSection } from '@/components/layout/sections'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useModuleCounts } from '@/composables/useModuleCounts'
import { useOpenPeriods } from '@/composables/useOpenPeriods'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'
import type { FinancialPeriodListView, PagedResponse } from '@/types'
import { markHandled } from '@/utils/handledErrors'
import { defaultPeriod } from '@/utils/movements'
import { oldestExpired, periodMonthName } from '@/utils/periods'
import { defaultStatementWallet } from '@/utils/statement'

const { t, locale } = useI18n()
const financialPeriods = useFinancialPeriodsStore()
const openPeriods = useOpenPeriods()
const wallets = useActiveWallets()

async function safely<T>(operation: () => Promise<T>): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    markHandled(error)
    return null
  }
}

function totalOf(page: Promise<PagedResponse<unknown>>): Promise<number> {
  return page.then((response) => response.page.totalElements)
}

function attention(total: number | null, key: string): string | null {
  return total ? t(key, total) : null
}

const periodsLoaded = safely(() => openPeriods.load())

async function inDefaultPeriod(count: (period: FinancialPeriodListView) => Promise<number>) {
  const loaded = await periodsLoaded
  const period = loaded === null ? undefined : defaultPeriod(openPeriods.periods.value)
  return period ? safely(() => count(period)) : null
}

const { counts } = useModuleCounts<number | string>({
  '/financial/movements': () =>
    inDefaultPeriod((period) =>
      totalOf(movementsApi.findAll({ financialPeriods: [period.id], size: 1 })),
    ),
  '/financial/transfers': () => safely(() => totalOf(transfersApi.findAll({ size: 1 }))),
  '/financial/statement': () =>
    safely(async () => {
      await wallets.load()
      return defaultStatementWallet(wallets.wallets.value)?.name ?? null
    }),
  '/financial/recurring-movements': () =>
    safely(() => totalOf(recurringMovementsApi.findAll({ ended: false, size: 1 }))),
  '/financial/imports': () => safely(async () => (await importsApi.counts({})).total),
  '/financial/invoices': () =>
    inDefaultPeriod((period) =>
      totalOf(invoicesApi.findAll({ financialPeriod: period.id, size: 1 })),
    ),
  '/financial/periods': () => financialPeriods.count('ALL'),
})

const { counts: attentions } = useModuleCounts<string>({
  '/financial/movements': async () =>
    attention(
      await safely(() => totalOf(movementsApi.findAll({ overdue: true, size: 1 }))),
      'module-home.attention.overdue',
    ),
  '/financial/imports': async () => {
    const imports = await safely(() => importsApi.counts({}))
    const parts = imports
      ? [
          attention(imports.ready, 'module-home.attention.imports-ready'),
          attention(imports.failed, 'module-home.attention.imports-failed'),
        ].filter(Boolean)
      : []
    return parts.length > 0 ? parts.join(' · ') : null
  },
  '/financial/invoices': async () =>
    attention(
      await safely(() => totalOf(invoicesApi.findAll({ statuses: ['CLOSED'], size: 1 }))),
      'module-home.attention.closed-invoice',
    ),
  '/financial/periods': async () => {
    const loaded = await periodsLoaded
    return loaded === null
      ? null
      : attention(
          openPeriods.periods.value.filter((period) => period.expired).length,
          'module-home.attention.expired',
        )
  },
  '/financial/closing': async () => {
    const loaded = await periodsLoaded
    const pending = loaded === null ? undefined : oldestExpired(openPeriods.periods.value)
    return pending
      ? t('module-home.attention.pending', {
          period: periodMonthName(pending.endingAt, locale.value),
        })
      : null
  },
})
</script>

<template>
  <ModuleHome
    :section="financialSection"
    description="module-home.description.financial"
    :counts="counts"
    :attentions="attentions"
  />
</template>
