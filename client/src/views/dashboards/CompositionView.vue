<script setup lang="ts">
import { CalendarDays, CalendarPlus, ChartBarBig, Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import IncomeSourcesCard from '@/components/dashboards/IncomeSourcesCard.vue'
import SeasonalityCard from '@/components/dashboards/SeasonalityCard.vue'
import SpendingCard from '@/components/dashboards/SpendingCard.vue'
import ListState from '@/components/listing/ListState.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useServerErrors } from '@/composables/useServerErrors'
import { useCompositionStore } from '@/stores/composition'
import { compositionByOf, validNode, type CompositionBy } from '@/utils/composition'
import { cutOf } from '@/utils/overview'
import { queryValue } from '@/utils/queryValue'

const route = useRoute()
const router = useRouter()
const store = useCompositionStore()
const { composition } = storeToRefs(store)
const { messages, run } = useServerErrors()
const { t } = useI18n()

const currentYear = new Date().getFullYear()
const loadFailed = ref(false)
const goingToLatest = ref(false)

const requestedCut = computed(() => cutOf(queryValue(route.query.year), currentYear))

const by = computed(() => compositionByOf(queryValue(route.query.by)))

const node = computed(() =>
  composition.value === null || by.value === 'classification'
    ? null
    : validNode(composition.value.costCenters, queryValue(route.query.costCenter)),
)

const needsLatestYear = computed(
  () =>
    composition.value !== null &&
    composition.value.years.length > 0 &&
    requestedCut.value !== 'all' &&
    !composition.value.years.includes(requestedCut.value),
)

const shownCut = computed(() => cutOf(composition.value!.cut, currentYear))

const yearChoices = computed(() => [
  ...[...composition.value!.years]
    .reverse()
    .map((year) => ({ value: String(year), label: String(year) })),
  { value: 'all', label: t('composition.all-periods') },
])

const cutLabel = computed(() =>
  shownCut.value === 'all' ? t('composition.all-periods').toLowerCase() : String(shownCut.value),
)

async function load() {
  loadFailed.value = !(await run(() => store.find(requestedCut.value)))
  goingToLatest.value = !loadFailed.value && needsLatestYear.value
  if (goingToLatest.value) {
    await changeQuery({
      year: String(composition.value!.years[composition.value!.years.length - 1]),
    })
  }
}

watch(requestedCut, load, { immediate: true })

function changeQuery(changes: Record<string, string | undefined>) {
  return router.replace({ query: { ...route.query, ...changes } })
}

function changeYear(value: unknown) {
  return changeQuery({ year: String(value) === String(currentYear) ? undefined : String(value) })
}

function changeBy(next: CompositionBy) {
  return changeQuery({
    by: next === 'classification' ? 'classification' : undefined,
    costCenter: undefined,
  })
}

function drill(next: string | null) {
  return changeQuery({ costCenter: next ?? undefined })
}

function createPeriod() {
  return router.push({ name: 'financial-periods.create' })
}
</script>

<template>
  <PageContainer>
    <PageHeader :title="$t('composition.title')">
      <template v-if="composition && composition.years.length > 0" #actions>
        <Select :model-value="String(requestedCut)" @update:model-value="changeYear">
          <SelectTrigger :aria-label="$t('composition.year')" class="w-auto">
            <CalendarDays />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="choice in yearChoices" :key="choice.value" :value="choice.value">
              {{ choice.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </template>
    </PageHeader>
    <ListState
      v-if="loadFailed"
      kind="error"
      entity="composition"
      :icon="ChartBarBig"
      :message="messages[0]"
      @retry="load()"
    />
    <div v-else-if="!composition || goingToLatest" class="grid gap-5" data-slot="loading">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Skeleton class="h-80" />
        <Skeleton class="h-80" />
      </div>
      <Skeleton class="h-56 w-full" />
    </div>
    <Card
      v-else-if="composition.years.length === 0"
      class="grid justify-items-center gap-2 px-6 py-14 text-center"
      role="status"
      data-state="empty"
    >
      <span class="bg-accent text-accent-foreground grid size-11 place-content-center rounded-md">
        <CalendarPlus class="size-5" />
      </span>
      <p class="text-base font-semibold">{{ $t('composition.empty.title') }}</p>
      <Button type="button" size="sm" class="mt-1" @click="createPeriod()">
        <Plus />
        {{ $t('composition.empty.action') }}
      </Button>
    </Card>
    <div v-else class="grid gap-5 *:min-w-0">
      <div class="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" data-slot="where">
        <SpendingCard
          :composition="composition"
          :by="by"
          :node="node"
          @update:by="changeBy"
          @drill="drill"
        />
        <IncomeSourcesCard
          :sources="composition.incomeSources"
          :total="composition.revenues"
          :cut="cutLabel"
        />
      </div>
      <SeasonalityCard
        v-if="composition.seasonality.length > 0"
        :composition="composition"
        :average="shownCut === 'all'"
        :year="String(shownCut)"
      />
    </div>
  </PageContainer>
</template>
