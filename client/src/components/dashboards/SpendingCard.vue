<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import RankedBars from '@/components/dashboards/RankedBars.vue'
import { Card } from '@/components/ui/card'
import type { CompositionView } from '@/types'
import {
  classificationLevel,
  costCenterLevel,
  costCenterPath,
  rankRows,
  type CompositionBy,
} from '@/utils/composition'
import { formatRate } from '@/utils/overview'

const props = defineProps<{
  composition: CompositionView
  by: CompositionBy
  node: string | null
}>()

const emit = defineEmits<{ 'update:by': [by: CompositionBy]; drill: [node: string | null] }>()

const { t, locale } = useI18n()

const TABS: CompositionBy[] = ['costCenter', 'classification']

const level = computed(() =>
  props.by === 'classification'
    ? classificationLevel(props.composition)
    : costCenterLevel(props.composition, props.node),
)

const classificationsFolded = computed(() => props.by === 'classification' || level.value.leaf)

const rows = computed(() =>
  rankRows(level.value.inputs, level.value.total, (count) =>
    t(
      classificationsFolded.value
        ? 'composition.spending.rest-classifications'
        : 'composition.spending.rest-cost-centers',
      count,
    ),
  ),
)

const path = computed(() => costCenterPath(props.composition.costCenters, props.node))

const nodeShare = computed(() =>
  formatRate(
    props.composition.expenses > 0 ? level.value.total / props.composition.expenses : 0,
    locale.value,
  ),
)

function open(key: string) {
  emit('drill', key)
}
</script>

<template>
  <Card class="gap-0 py-0" data-slot="spending">
    <div
      class="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5"
    >
      <h2 class="text-base font-semibold">{{ $t('composition.spending.title') }}</h2>
      <span class="flex flex-wrap items-center gap-3">
        <span data-slot="spending-total">
          <CurrencyDisplay :value="composition.expenses" tone="expense" />
        </span>
        <div
          class="bg-muted inline-flex h-9 items-center gap-0.5 rounded-md p-1"
          role="group"
          :aria-label="$t('composition.spending.tabs')"
        >
          <button
            v-for="option in TABS"
            :key="option"
            type="button"
            :aria-pressed="by === option"
            class="text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs inline-flex h-7 items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors"
            @click="emit('update:by', option)"
          >
            {{ $t(`composition.spending.${option}`) }}
          </button>
        </div>
      </span>
    </div>
    <div class="grid gap-4 p-5">
      <div
        v-if="by === 'costCenter'"
        class="flex flex-wrap items-baseline justify-between gap-2"
        data-slot="level-header"
      >
        <nav
          class="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm"
          :aria-label="$t('composition.spending.level')"
        >
          <button
            v-if="node !== null"
            type="button"
            class="hover:text-foreground"
            data-slot="crumb"
            @click="emit('drill', null)"
          >
            {{ $t('composition.spending.all') }}
          </button>
          <span v-else aria-current="page" class="text-foreground font-medium">{{
            $t('composition.spending.all')
          }}</span>
          <template v-for="(step, index) in path" :key="step.id">
            <ChevronRight class="size-3.5" />
            <span
              v-if="index === path.length - 1"
              aria-current="page"
              class="text-foreground font-medium"
              >{{ step.name }}</span
            >
            <button
              v-else
              type="button"
              class="hover:text-foreground"
              data-slot="crumb"
              @click="open(step.id)"
            >
              {{ step.name }}
            </button>
          </template>
        </nav>
        <span v-if="node !== null" class="text-muted-foreground text-xs" data-slot="level-total">
          <CurrencyDisplay :value="level.total" bare /> ·
          <span class="font-mono">{{ nodeShare }}</span> {{ $t('composition.spending.of-total') }}
        </span>
      </div>
      <RankedBars v-if="rows.length > 0" :rows="rows" @drill="open" />
      <p v-else class="text-muted-foreground text-sm" data-slot="spending-empty">
        {{ $t('composition.spending.empty') }}
      </p>
    </div>
  </Card>
</template>
