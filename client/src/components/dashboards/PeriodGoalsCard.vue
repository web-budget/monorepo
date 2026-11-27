<script setup lang="ts">
import { Pencil } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import GoalRow from '@/components/dashboards/GoalRow.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { PeriodDashboardGoals, PeriodFixedVsVariable } from '@/types'
import { formatRate } from '@/utils/overview'

const props = defineProps<{ goals: PeriodDashboardGoals; fixedVsVariable: PeriodFixedVsVariable }>()

const emit = defineEmits<{ 'edit-goals': [] }>()

const { t, n, locale } = useI18n()

const missingGoal = computed(
  () => props.goals.revenues.goal === null || props.goals.expenses.goal === null,
)

const total = computed(() => props.fixedVsVariable.fixed + props.fixedVsVariable.variable)

const fixedWidth = computed(() =>
  total.value > 0 ? (props.fixedVsVariable.fixed / total.value) * 100 : 0,
)

const variableWidth = computed(() => (total.value > 0 ? 100 - fixedWidth.value : 0))

const share = computed(() => {
  const value = props.fixedVsVariable.fixedShareOfRevenueGoal
  return value === null ? null : formatRate(value, locale.value)
})

const summary = computed(() =>
  t('period-dashboard.fixed-vs-variable.summary', {
    fixed: Math.round(fixedWidth.value),
    variable: Math.round(variableWidth.value),
  }),
)
</script>

<template>
  <Card class="gap-0 py-0" data-slot="goals">
    <div
      class="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5"
    >
      <h2 class="text-base font-semibold">{{ $t('period-dashboard.goals.title') }}</h2>
      <Button v-if="missingGoal" variant="outline" size="sm" @click="emit('edit-goals')">
        <Pencil />{{ $t('period-dashboard.goals.edit') }}
      </Button>
    </div>
    <div class="grid gap-6 p-5 md:grid-cols-2">
      <GoalRow
        kind="income"
        :label="$t('period-dashboard.goals.revenues')"
        :realized="goals.revenues.realized"
        :goal="goals.revenues.goal"
      />
      <GoalRow
        kind="expense"
        :label="$t('period-dashboard.goals.expenses')"
        :realized="goals.expenses.realized"
        :goal="goals.expenses.goal"
      />
    </div>
    <div class="border-border grid gap-3 border-t p-5" data-slot="fixed-vs-variable">
      <h3 class="text-sm font-semibold">{{ $t('period-dashboard.fixed-vs-variable.title') }}</h3>
      <div class="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" :aria-label="summary">
        <span
          class="bg-chart-1"
          :style="{ width: `${fixedWidth}%` }"
          :title="`${$t('period-dashboard.fixed-vs-variable.fixed')} · ${n(fixedVsVariable.fixed, 'currency')}`"
          data-slot="fixed-part"
        />
        <span
          class="bg-[color-mix(in_oklch,var(--chart-1)_30%,var(--card))]"
          :style="{ width: `${variableWidth}%` }"
          :title="`${$t('period-dashboard.fixed-vs-variable.variable')} · ${n(fixedVsVariable.variable, 'currency')}`"
          data-slot="variable-part"
        />
      </div>
      <dl class="grid gap-2.5 text-sm md:grid-cols-3 md:gap-6">
        <div class="flex items-center justify-between gap-3 md:grid md:justify-start md:gap-1">
          <dt class="text-muted-foreground flex items-center gap-2">
            <span class="bg-chart-1 size-2.5 shrink-0 rounded-[1px]" />
            {{ $t('period-dashboard.fixed-vs-variable.fixed') }}
          </dt>
          <dd class="m-0" data-slot="fixed">
            <CurrencyDisplay :value="fixedVsVariable.fixed" tone="expense" />
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3 md:grid md:justify-start md:gap-1">
          <dt class="text-muted-foreground flex items-center gap-2">
            <span
              class="size-2.5 shrink-0 rounded-[1px] bg-[color-mix(in_oklch,var(--chart-1)_30%,var(--card))]"
            />
            {{ $t('period-dashboard.fixed-vs-variable.variable') }}
          </dt>
          <dd class="m-0" data-slot="variable">
            <CurrencyDisplay :value="fixedVsVariable.variable" tone="expense" />
          </dd>
        </div>
        <div class="flex items-center justify-between gap-3 md:grid md:justify-start md:gap-1">
          <dt class="text-muted-foreground">
            {{ $t('period-dashboard.fixed-vs-variable.share') }}
          </dt>
          <dd class="m-0" data-slot="share">
            <span v-if="share !== null" class="font-mono tabular-nums">{{ share }}</span>
            <Badge v-else variant="pending">{{
              $t('period-dashboard.fixed-vs-variable.no-goal')
            }}</Badge>
          </dd>
        </div>
      </dl>
    </div>
  </Card>
</template>
