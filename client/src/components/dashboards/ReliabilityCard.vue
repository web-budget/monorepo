<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import FigureStrip, { type Figure } from '@/components/dashboards/FigureStrip.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { OverviewReliability } from '@/types'
import { formatBalance } from '@/utils/money'
import { formatRate } from '@/utils/overview'

const CENT_TOLERANCE = 0.005

const props = defineProps<{
  reliability: OverviewReliability
  cutLabel: string
  untilToday: boolean
}>()

const { t, n, locale } = useI18n()

const matches = computed(() => Math.abs(props.reliability.residue) < CENT_TOLERANCE)

const residueLabel = computed(() =>
  t('overview.reliability.residue', { value: formatBalance(n, props.reliability.residue) }),
)

const marked = computed(() => props.reliability.generic.classifications)

const genericWeight = computed(() => {
  const { value, total } = props.reliability.generic
  return formatRate(total > 0 ? value / total : 0, locale.value)
})

const untilTodayNote = computed(() =>
  props.untilToday ? t('overview.reliability.until-today') : undefined,
)

const figures = computed<Figure[]>(() => [
  {
    key: 'accumulated',
    label: t('overview.reliability.figures.accumulated'),
    note: untilTodayNote.value,
  },
  {
    key: 'balances-total',
    label: t('overview.reliability.figures.balances-total'),
    note: t(
      props.untilToday
        ? 'overview.reliability.wallets-until-today'
        : 'overview.reliability.wallets',
      props.reliability.walletCount,
    ),
  },
  {
    key: 'difference',
    label: t('overview.reliability.figures.difference'),
    note: untilTodayNote.value,
  },
  {
    key: 'adjustments-total',
    label: t('overview.reliability.figures.adjustments-total'),
    note: untilTodayNote.value,
  },
  {
    key: 'adjustments',
    label: t('overview.reliability.figures.adjustments', { cut: props.cutLabel }),
  },
  {
    key: 'credited',
    label: t('overview.reliability.figures.credited'),
    note:
      props.reliability.adjustments.count === 0
        ? t('overview.reliability.no-adjustments', { cut: props.cutLabel })
        : undefined,
  },
  { key: 'debited', label: t('overview.reliability.figures.debited') },
  { key: 'generic-weight', label: t('overview.reliability.figures.generic-weight') },
])
</script>

<template>
  <Card class="gap-0 overflow-hidden py-0" data-slot="reliability">
    <div
      class="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5"
    >
      <h2 class="text-base font-semibold">{{ $t('overview.reliability.title') }}</h2>
      <Badge v-if="matches" variant="approved" data-slot="reliability-status">
        {{ $t('overview.reliability.matches') }}
      </Badge>
      <Badge v-else variant="blocked" class="before:hidden" data-slot="reliability-status">
        <TriangleAlert />{{ residueLabel }}
      </Badge>
    </div>
    <FigureStrip :figures="figures">
      <template #value-accumulated>
        <CurrencyDisplay
          :value="reliability.accumulated"
          :signed="reliability.accumulated < 0"
          glued
        />
      </template>
      <template #value-balances-total>
        <CurrencyDisplay
          :value="reliability.balancesTotal"
          :signed="reliability.balancesTotal < 0"
          glued
        />
      </template>
      <template #value-difference>
        <CurrencyDisplay
          :value="reliability.difference"
          :signed="reliability.difference < 0"
          glued
        />
      </template>
      <template #value-adjustments-total>
        <CurrencyDisplay
          :value="reliability.adjustmentsTotal"
          :signed="reliability.adjustmentsTotal < 0"
          glued
        />
      </template>
      <template #value-adjustments>
        <span class="font-mono tabular-nums">{{ reliability.adjustments.count }}</span>
      </template>
      <template #value-credited>
        <CurrencyDisplay :value="reliability.adjustments.credited" tone="income" />
      </template>
      <template #value-debited>
        <CurrencyDisplay :value="reliability.adjustments.debited" tone="expense" />
      </template>
      <template #value-generic-weight>
        <span class="font-mono tabular-nums">{{ marked.length > 0 ? genericWeight : '—' }}</span>
      </template>
      <template #note-generic-weight>
        <template v-if="marked.length > 0">
          <template v-for="(classification, index) in marked" :key="classification.id">
            <template v-if="index > 0">{{ ', ' }}</template>
            <RouterLink
              :to="{ name: 'classifications.detail', params: { id: classification.id } }"
              class="hover:text-foreground hover:underline"
            >
              {{ classification.name }}
            </RouterLink>
          </template>
          {{ '·' }}
          <CurrencyDisplay :value="reliability.generic.value" />
        </template>
        <RouterLink
          v-else
          :to="{ name: 'classifications' }"
          class="text-highlight-foreground underline-offset-2 hover:underline"
        >
          {{ $t('overview.reliability.no-generic') }}
        </RouterLink>
      </template>
    </FigureStrip>
    <div v-if="!matches" class="border-border border-t p-4" data-slot="residue-alert">
      <Alert variant="destructive" role="alert">
        <TriangleAlert />
        <AlertTitle>{{ $t('overview.reliability.alert') }}</AlertTitle>
        <AlertDescription class="text-muted-foreground">{{ residueLabel }}</AlertDescription>
      </Alert>
    </div>
  </Card>
</template>
