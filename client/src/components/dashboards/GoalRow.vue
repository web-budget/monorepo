<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import MeterBar from '@/components/dashboards/MeterBar.vue'
import { Badge } from '@/components/ui/badge'
import {
  goalPercentage,
  goalSignal,
  meterWidth,
  type GoalKind,
  type GoalSignal,
} from '@/utils/goalSignal'

const props = defineProps<{
  kind: GoalKind
  label: string
  realized: number
  goal: number | null
}>()

const { t, n } = useI18n()

const BADGES = { ok: 'approved', warn: 'pending', over: 'blocked' } as const

const hasGoal = computed(() => props.goal !== null && props.goal > 0)

const signal = computed<GoalSignal | null>(() =>
  hasGoal.value ? goalSignal(props.kind, props.realized, props.goal!) : null,
)

const percentage = computed(() => Math.round(goalPercentage(props.realized, props.goal!)))

const gap = computed(() => Math.abs(props.goal! - props.realized))

const text = computed(() => {
  const amount = n(gap.value, 'currency')
  const remaining = props.goal! - props.realized
  if (props.kind === 'income') {
    if (remaining > 0) return t('period-dashboard.goals.income.missing', { amount })
    return remaining < 0
      ? t('period-dashboard.goals.income.above', { amount })
      : t('period-dashboard.goals.income.equal')
  }
  return remaining >= 0
    ? t('period-dashboard.goals.expense.left', { amount })
    : t('period-dashboard.goals.expense.above', { amount })
})

const badge = computed(() => t(`period-dashboard.goals.${props.kind}.${signal.value}`))
</script>

<template>
  <div class="grid gap-2" :data-goal="kind">
    <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <span class="font-medium">{{ label }}</span>
      <span class="text-sm">
        <CurrencyDisplay :value="realized" :tone="kind" />
        <template v-if="goal !== null">
          <span class="text-muted-foreground"> {{ $t('period-dashboard.goals.of') }} </span>
          <CurrencyDisplay :value="goal" />
        </template>
      </span>
    </div>
    <template v-if="signal !== null">
      <div class="flex items-center gap-3">
        <MeterBar
          class="flex-1"
          :width="meterWidth(realized, goal!)"
          :signal="signal"
          :label="$t('period-dashboard.goals.meter', { label, percentage: percentage })"
        />
        <span class="w-12 text-right font-mono text-sm tabular-nums" data-slot="percentage"
          >{{ percentage }}%</span
        >
      </div>
      <div class="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
        <span data-slot="goal-text">{{ text }}</span>
        <Badge :variant="BADGES[signal]" data-slot="goal-state">{{ badge }}</Badge>
      </div>
    </template>
    <Badge v-else variant="pending" class="w-fit" data-slot="no-goal">
      <CircleAlert />{{ $t(`period-dashboard.goals.${kind}.none`) }}
    </Badge>
  </div>
</template>
