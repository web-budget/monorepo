<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import MeterBar from '@/components/dashboards/MeterBar.vue'
import type { RankRow } from '@/utils/composition'
import { formatRate } from '@/utils/overview'

const props = defineProps<{ rows: RankRow[] }>()

const emit = defineEmits<{ drill: [key: string] }>()

const { n, locale } = useI18n()

const largest = computed(() => Math.max(...props.rows.map((row) => row.value)))

function share(row: RankRow): string {
  return formatRate(row.share, locale.value)
}

function width(row: RankRow): number {
  return (row.value / largest.value) * 100
}

function title(row: RankRow): string {
  return `${row.rest ?? row.name} · ${n(row.value, 'currency')} · ${share(row)}`
}
</script>

<template>
  <ul class="grid gap-3.5" data-slot="ranked-bars">
    <li
      v-for="row in rows"
      :key="row.key"
      :class="['grid gap-1.5', row.rest !== null && 'text-muted-foreground']"
      :title="title(row)"
      data-slot="rank-row"
    >
      <div class="flex items-baseline justify-between gap-3 text-sm">
        <button
          v-if="row.drill !== null"
          type="button"
          class="inline-flex min-w-0 items-center gap-1 text-left font-medium hover:underline"
          data-slot="drill"
          @click="emit('drill', row.drill)"
        >
          {{ row.name }}<ChevronRight class="text-muted-foreground size-3.5" />
        </button>
        <span v-else class="min-w-0" data-slot="rank-name">{{ row.name }}</span>
        <span class="flex shrink-0 items-baseline gap-3">
          <CurrencyDisplay :value="row.value" bare />
          <span
            class="text-muted-foreground w-14 text-right font-mono text-xs tabular-nums"
            data-slot="rank-share"
            >{{ share(row) }}</span
          >
        </span>
      </div>
      <MeterBar :width="width(row)" :label="`${row.name}: ${share(row)}`" />
    </li>
  </ul>
</template>
