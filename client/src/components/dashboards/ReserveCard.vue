<script setup lang="ts">
import { ShieldCheck } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import FigureStrip, { type Figure } from '@/components/dashboards/FigureStrip.vue'
import MeterBar from '@/components/dashboards/MeterBar.vue'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { OverviewCostOfLiving, OverviewReserve } from '@/types'
import { formatShare, reserveMeterWidth, reserveShare } from '@/utils/overview'

const FULL_YEAR = 12

const props = defineProps<{
  accumulated: number
  costOfLiving: OverviewCostOfLiving
  reserve: OverviewReserve
  untilToday: boolean
}>()

const { t, locale } = useI18n()

const costNote = computed(() => {
  const { value, basedOn } = props.costOfLiving
  if (value === null) return t('overview.reserve.cost-note.none')
  return basedOn < FULL_YEAR
    ? t('overview.reserve.cost-note.based-on', basedOn)
    : t('overview.reserve.cost-note.per-period')
})

const figures = computed<Figure[]>(() => {
  const list: Figure[] = [
    { key: 'accumulated', label: t('overview.reserve.figures.accumulated') },
    {
      key: 'cost-of-living',
      label: t('overview.reserve.figures.cost-of-living'),
      note: costNote.value,
    },
    { key: 'reserve-current', label: t('overview.reserve.figures.current') },
  ]
  if (props.reserve.ideal !== null) {
    list.push({
      key: 'reserve-ideal',
      label: t('overview.reserve.figures.ideal'),
      note: t('overview.reserve.ideal-note', props.reserve.months),
    })
  }
  return list
})

const share = computed(() =>
  props.reserve.ideal === null ? null : reserveShare(props.reserve.current, props.reserve.ideal),
)

const covered = computed(() => share.value! >= 1)

const missing = computed(() => props.reserve.ideal! - props.reserve.current)

const shareLabel = computed(() => formatShare(share.value!, locale.value))
</script>

<template>
  <Card class="gap-0 overflow-hidden py-0" data-slot="reserve">
    <div
      class="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5"
    >
      <h2 class="text-base font-semibold">{{ $t('overview.reserve.title') }}</h2>
      <Badge v-if="untilToday" variant="outline" data-slot="until-today">
        {{ $t('overview.until-today') }}
      </Badge>
    </div>
    <FigureStrip :figures="figures">
      <template #value-accumulated>
        <CurrencyDisplay :value="accumulated" :signed="accumulated < 0" glued />
      </template>
      <template #value-cost-of-living>
        <CurrencyDisplay v-if="costOfLiving.value !== null" :value="costOfLiving.value" />
        <span v-else class="font-mono tabular-nums">—</span>
      </template>
      <template #value-reserve-current>
        <CurrencyDisplay :value="reserve.current" />
      </template>
      <template #value-reserve-ideal>
        <CurrencyDisplay :value="reserve.ideal" />
      </template>
    </FigureStrip>
    <div
      v-if="share !== null"
      class="border-border grid gap-2.5 border-t px-5 py-4"
      data-slot="reserve-progress"
    >
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
        <i18n-t keypath="overview.reserve.progress" tag="span" class="text-muted-foreground">
          <template #share>
            <span class="text-foreground font-mono font-medium tabular-nums">{{ shareLabel }}</span>
          </template>
        </i18n-t>
        <Badge v-if="covered" variant="approved" data-slot="covered">
          <ShieldCheck />{{ $t('overview.reserve.covered') }}
        </Badge>
        <i18n-t v-else keypath="overview.reserve.missing" tag="span" class="text-muted-foreground">
          <template #value>
            <CurrencyDisplay :value="missing" class="text-foreground font-medium" />
          </template>
        </i18n-t>
      </div>
      <MeterBar
        :width="reserveMeterWidth(share)"
        :label="$t('overview.reserve.meter', { share: shareLabel })"
      />
    </div>
  </Card>
</template>
