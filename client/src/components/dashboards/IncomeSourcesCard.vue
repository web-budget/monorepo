<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import RankedBars from '@/components/dashboards/RankedBars.vue'
import { Card } from '@/components/ui/card'
import type { CompositionIncomeSource } from '@/types'
import { sortedRows } from '@/utils/composition'
import { formatRate } from '@/utils/overview'

const props = defineProps<{ sources: CompositionIncomeSource[]; total: number; cut: string }>()

const { locale } = useI18n()

const largest = computed(() =>
  props.sources.reduce((largest, source) => (source.value > largest.value ? source : largest)),
)

const weight = computed(() => formatRate(largest.value.value / props.total, locale.value))

const rows = computed(() =>
  sortedRows(
    props.sources.map((source) => ({
      key: source.id,
      name: source.name,
      value: source.value,
      drill: null,
    })),
    props.total,
  ),
)
</script>

<template>
  <Card class="gap-0 py-0" data-slot="income-sources">
    <div
      class="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5"
    >
      <h2 class="text-base font-semibold">{{ $t('composition.income.title') }}</h2>
      <span data-slot="income-total"><CurrencyDisplay :value="total" tone="income" /></span>
    </div>
    <div class="grid gap-5 p-5">
      <template v-if="sources.length > 0">
        <dl class="grid grid-cols-2 gap-4">
          <div>
            <dt class="text-muted-foreground mb-0.5 text-xs">
              {{ $t('composition.income.largest') }}
            </dt>
            <dd class="m-0 font-medium" data-slot="largest">{{ largest.name }}</dd>
          </div>
          <div>
            <dt class="text-muted-foreground mb-0.5 text-xs">
              {{ $t('composition.income.weight') }}
            </dt>
            <dd class="m-0 font-mono text-xl font-semibold tabular-nums" data-slot="weight">
              {{ weight }}
            </dd>
          </div>
        </dl>
        <RankedBars :rows="rows" />
      </template>
      <p v-else class="text-muted-foreground text-sm" data-slot="income-empty">
        {{ $t('composition.income.empty', { cut }) }}
      </p>
    </div>
  </Card>
</template>
