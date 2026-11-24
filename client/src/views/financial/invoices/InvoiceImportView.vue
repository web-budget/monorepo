<script setup lang="ts">
import { FileUp, Upload } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { financialPeriodsApi } from '@/api/financialPeriods'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useActiveCards } from '@/composables/useActiveCards'
import { useServerErrors } from '@/composables/useServerErrors'
import type { FinancialPeriodListView } from '@/types'
import { cardLabel } from '@/utils/invoices'
import { defaultPeriod } from '@/utils/movements'
import { queryValue } from '@/utils/queryValue'

const OPTIONS_PAGE_SIZE = 100
const STEPS = ['upload', 'processing', 'draft']

const route = useRoute()
const activeCards = useActiveCards()
const { messages, run } = useServerErrors()

const periods = ref<FinancialPeriodListView[]>([])
const card = ref('')
const period = ref('')

const cardChoices = computed(() =>
  activeCards.cards.value.map((candidate) => ({
    value: candidate.id,
    label: cardLabel(candidate),
  })),
)
const periodChoices = computed(() =>
  periods.value
    .filter((candidate) => candidate.status === 'OPEN')
    .map((candidate) => ({ value: candidate.id, label: candidate.name })),
)

onMounted(async () => {
  await run(async () => {
    const [periodPage] = await Promise.all([
      financialPeriodsApi.findAll({ status: 'ALL', size: OPTIONS_PAGE_SIZE }),
      activeCards.load(),
    ])
    periods.value = periodPage.content
  })
  const requestedCard = queryValue(route.query.card)
  card.value =
    activeCards.cards.value.find((candidate) => candidate.id === requestedCard)?.id ??
    activeCards.cards.value[0]?.id ??
    ''
  const openPeriods = periods.value.filter((candidate) => candidate.status === 'OPEN')
  const requestedPeriod = queryValue(route.query.period)
  period.value =
    openPeriods.find((candidate) => candidate.id === requestedPeriod)?.id ??
    defaultPeriod(openPeriods)?.id ??
    ''
})
</script>

<template>
  <PageContainer>
    <PageHeader
      :title="$t('credit-card-invoice.import.title')"
      :description="$t('credit-card-invoice.import.description')"
    />
    <ServerErrorAlert :messages="messages" />
    <ol class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" data-slot="steps">
      <li
        v-for="(step, index) in STEPS"
        :key="step"
        :class="[
          'flex items-center gap-2',
          index === 0 ? 'font-semibold' : 'text-muted-foreground',
        ]"
      >
        <span
          :class="[
            'grid size-5 place-content-center rounded-sm font-mono text-[11px]',
            index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted',
          ]"
        >
          {{ index + 1 }}
        </span>
        {{ $t(`credit-card-invoice.import.steps.${step}`) }}
      </li>
    </ol>
    <Card class="grid gap-4 p-5" data-slot="upload">
      <div class="grid gap-4 md:grid-cols-2">
        <FilterSelect
          v-model="card"
          :label="$t('credit-card-invoice.import.card')"
          :options="cardChoices"
        />
        <div class="grid gap-1.5">
          <FilterSelect
            v-model="period"
            :label="$t('credit-card-invoice.import.period')"
            :options="periodChoices"
          />
          <p class="text-muted-foreground text-xs">
            {{ $t('credit-card-invoice.import.period-hint') }}
          </p>
        </div>
      </div>
      <label
        class="border-input bg-muted/50 grid justify-items-center gap-2 rounded-md border border-dashed px-6 py-10 text-center"
      >
        <FileUp class="text-muted-foreground size-6" />
        <span class="font-medium">{{ $t('credit-card-invoice.import.drop') }}</span>
        <span class="text-muted-foreground text-sm">{{
          $t('credit-card-invoice.import.formats')
        }}</span>
        <input type="file" class="sr-only" accept=".csv,.ofx" disabled />
      </label>
      <div class="flex justify-end">
        <Button type="button" disabled
          ><Upload />{{ $t('credit-card-invoice.import.send') }}</Button
        >
      </div>
    </Card>
    <Card class="gap-0 py-0" data-slot="recent">
      <div class="border-b px-5 py-4">
        <h2 class="text-base font-semibold">{{ $t('credit-card-invoice.import.recent') }}</h2>
      </div>
      <p class="text-muted-foreground px-5 py-4 text-sm">
        {{ $t('credit-card-invoice.import.recent-empty') }}
      </p>
    </Card>
  </PageContainer>
</template>
