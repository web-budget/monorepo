<script setup lang="ts">
import { Lock, LockOpen } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import PeriodStatusBadge from '@/components/listing/PeriodStatusBadge.vue'
import { Button } from '@/components/ui/button'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useReopenPeriod } from '@/composables/useReopenPeriod'
import { useServerErrors } from '@/composables/useServerErrors'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'
import type { FinancialPeriodResultView } from '@/types'

const props = defineProps<{ id: string }>()

const router = useRouter()
const store = useFinancialPeriodsStore()
const { financialPeriod } = storeToRefs(store)

const { messages, changeToUpdate, remove } = useCrudDetail({
  routeName: 'financial-periods',
  entity: 'financial-period',
  id: () => props.id,
  name: () => financialPeriod.value?.name,
  findOne: store.findOne,
  remove: store.remove,
})

const resultErrors = useServerErrors()
const periodResult = ref<FinancialPeriodResultView>()
const lastClosedId = ref<string | null>(null)

const reopenable = computed(
  () => financialPeriod.value?.status === 'CLOSED' && lastClosedId.value === props.id,
)

async function loadResult() {
  await resultErrors.run(async () => {
    periodResult.value = await store.findResult(props.id)
    lastClosedId.value = await store.findLastClosedId()
  })
}

async function reloadAfterReopen() {
  await store.findOne(props.id)
  await loadResult()
}

const reopening = useReopenPeriod(reloadAfterReopen)

function closePeriod() {
  return router.push({ path: '/financial/closing', query: { period: props.id } })
}

onMounted(loadResult)
</script>

<template>
  <DetailCard
    :title="financialPeriod?.name ?? $t('financial-period.form.detailing')"
    :messages="[...messages, ...resultErrors.messages.value, ...reopening.messages.value]"
    :readonly="financialPeriod?.status === 'CLOSED'"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template v-if="financialPeriod" #badge>
      <PeriodStatusBadge :status="financialPeriod.status" :expired="financialPeriod.expired" />
    </template>
    <template v-if="financialPeriod?.status === 'OPEN' || reopenable" #extra-actions>
      <Button v-if="financialPeriod?.status === 'OPEN'" type="button" @click="closePeriod()">
        <Lock />{{ $t('period-closing.actions.close') }}
      </Button>
      <Button
        v-else-if="reopenable"
        type="button"
        variant="outline"
        @click="reopening.reopen(financialPeriod!)"
      >
        <LockOpen />{{ $t('period-closing.actions.reopen') }}
      </Button>
    </template>
    <template v-if="financialPeriod">
      <DetailSection :title="$t('financial-period.sections.identification')">
        <DetailField :label="$t('financial-period.form.name')" :value="financialPeriod.name" />
      </DetailSection>
      <DetailSection :title="$t('financial-period.sections.dates')">
        <DetailField :label="$t('financial-period.form.starting-at')" mono>
          <DateTimeDisplay fix-time :value="financialPeriod.startingAt" />
        </DetailField>
        <DetailField :label="$t('financial-period.form.ending-at')" mono>
          <DateTimeDisplay fix-time :value="financialPeriod.endingAt" />
        </DetailField>
      </DetailSection>
      <DetailSection
        v-if="periodResult"
        :title="
          $t(
            periodResult.recorded
              ? 'financial-period.sections.result-closed'
              : 'financial-period.sections.result',
          )
        "
      >
        <DetailField :label="$t('financial-period.result.revenues')">
          <CurrencyDisplay :value="periodResult.revenues" zero-if-null />
        </DetailField>
        <DetailField :label="$t('financial-period.result.expenses')">
          <CurrencyDisplay :value="periodResult.expenses" zero-if-null />
        </DetailField>
        <DetailField :label="$t('financial-period.result.result')">
          <CurrencyDisplay :value="periodResult.result" signed />
        </DetailField>
      </DetailSection>
      <DetailSection :title="$t('financial-period.sections.movements')">
        <Button as-child variant="outline" class="w-fit">
          <RouterLink :to="{ path: '/financial/movements', query: { period: id } }">
            {{ $t('financial-period.actions.view-movements') }}
          </RouterLink>
        </Button>
      </DetailSection>
      <DetailSection :title="$t('financial-period.sections.goals')">
        <DetailField :label="$t('financial-period.form.revenues-goal')">
          <CurrencyDisplay :value="financialPeriod.revenuesGoal" zero-if-null />
        </DetailField>
        <DetailField :label="$t('financial-period.form.expenses-goal')">
          <CurrencyDisplay :value="financialPeriod.expensesGoal" zero-if-null />
        </DetailField>
      </DetailSection>
    </template>
  </DetailCard>
</template>
