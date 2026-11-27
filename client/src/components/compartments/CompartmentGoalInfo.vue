<script setup lang="ts">
import { CalendarX, CircleCheck } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import { Badge } from '@/components/ui/badge'
import type { CompartmentView } from '@/types'
import { percentageOf, progressWidth } from '@/utils/compartments'

defineProps<{ compartment: CompartmentView }>()

const { n } = useI18n()
</script>

<template>
  <div v-if="compartment.targetValue" class="grid min-w-0 gap-1.5" data-slot="goal-info">
    <div
      role="progressbar"
      :aria-label="$t('compartment.goal.label', { name: compartment.name })"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.min(100, percentageOf(compartment.progress ?? 0))"
      :class="['bg-muted relative h-1.5 overflow-hidden rounded-xs']"
    >
      <span
        :class="[
          'absolute inset-y-0 left-0 rounded-xs',
          compartment.achieved ? 'bg-income' : 'bg-primary',
        ]"
        :style="{ width: `${progressWidth(compartment.progress ?? 0)}%` }"
      />
    </div>
    <div
      class="text-muted-foreground flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs"
    >
      <i18n-t keypath="compartment.goal.progress" tag="span">
        <template #percentage>
          <span class="text-foreground font-mono tabular-nums"
            >{{ percentageOf(compartment.progress ?? 0) }}%</span
          >
        </template>
        <template #target>
          <span class="font-mono tabular-nums">{{
            n(compartment.targetValue, 'currency').replace(/^R\$\s*/, '')
          }}</span>
        </template>
      </i18n-t>
      <Badge v-if="compartment.achieved" variant="approved">
        <CircleCheck />{{ $t('compartment.goal.achieved') }}
      </Badge>
      <Badge v-else-if="compartment.overdue && compartment.targetDate" variant="blocked">
        <CalendarX />
        <i18n-t keypath="compartment.goal.overdue" tag="span">
          <template #date>
            <DateTimeDisplay :value="compartment.targetDate" fix-time />
          </template>
        </i18n-t>
      </Badge>
      <i18n-t
        v-else-if="compartment.monthlyAmount && compartment.targetDate"
        keypath="compartment.goal.monthly"
        tag="span"
      >
        <template #amount>
          <CurrencyDisplay :value="compartment.monthlyAmount" bare />
        </template>
        <template #date>
          <DateTimeDisplay class="font-mono" :value="compartment.targetDate" fix-time />
        </template>
      </i18n-t>
    </div>
  </div>
  <span
    v-else-if="compartment.targetDate"
    class="text-muted-foreground text-xs"
    data-slot="goal-info"
  >
    <i18n-t keypath="compartment.goal.until" tag="span">
      <template #date>
        <DateTimeDisplay class="font-mono" :value="compartment.targetDate" fix-time />
      </template>
    </i18n-t>
  </span>
</template>
