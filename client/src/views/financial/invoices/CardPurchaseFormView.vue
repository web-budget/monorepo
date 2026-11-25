<script setup lang="ts">
import { CircleAlert, CreditCard } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useActiveCards } from '@/composables/useActiveCards'
import { useCrudForm } from '@/composables/useCrudForm'
import { useMovementFilterOptions } from '@/composables/useMovementFilterOptions'
import { useOpenInvoice } from '@/composables/useOpenInvoice'
import {
  cardPurchaseFormDefaults,
  cardPurchaseFormSchema,
  toCardPurchaseCreateForm,
  toCardPurchaseFormValues,
  toCardPurchaseUpdateForm,
} from '@/schemas/cardPurchaseSchema'
import { useCardPurchasesStore } from '@/stores/cardPurchases'
import { cardLabel } from '@/utils/invoices'
import { defaultPeriod } from '@/utils/movements'
import { queryValue } from '@/utils/queryValue'

const props = defineProps<{ id?: string }>()

const { t } = useI18n()
const route = useRoute()
const store = useCardPurchasesStore()
const options = useMovementFilterOptions()
const activeCards = useActiveCards()
const openInvoice = useOpenInvoice()

const form = useForm({
  validationSchema: cardPurchaseFormSchema,
  initialValues: cardPurchaseFormDefaults(),
})

const { messages, fields, submitting, loadingRecord, dirty, changeToList, onSubmit, run } =
  useCrudForm({
    routeName: 'purchases',
    entity: 'card-purchase',
    id: () => props.id,
    form,
    findOne: store.findOne,
    toFormValues: toCardPurchaseFormValues,
    create: (values) => store.create(toCardPurchaseCreateForm(values)),
    update: (id, values) => store.update(id, toCardPurchaseUpdateForm(values)),
    detailAfterUpdate: true,
    createDefaults,
  })

const updating = computed(() => props.id !== undefined)

async function createDefaults() {
  await optionsReady
  const requestedCard = queryValue(route.query.card)
  const card =
    activeCards.cards.value.find((candidate) => candidate.id === requestedCard) ??
    activeCards.cards.value[0]
  const openPeriods = options.periods.value.filter((period) => period.status === 'OPEN')
  const requestedPeriod = queryValue(route.query.period)
  const period =
    openPeriods.find((candidate) => candidate.id === requestedPeriod) ?? defaultPeriod(openPeriods)
  return { ...cardPurchaseFormDefaults(), card: card?.id, financialPeriod: period?.id }
}

const cardChoices = computed(() =>
  activeCards.cards.value.map((card) => ({ value: card.id, label: cardLabel(card) })),
)
const periodChoices = computed(() =>
  options.periods.value
    .filter((period) => period.status === 'OPEN' || period.id === form.values.financialPeriod)
    .map((period) => ({
      value: period.id,
      label: period.expired
        ? `${period.name} · ${t('card-purchase.form.expired-suffix')}`
        : period.name,
    })),
)
const costCenterChoices = computed(() =>
  options.costCenters.value.map((costCenter) => ({
    value: costCenter.id,
    label: costCenter.fullName,
  })),
)
const classificationChoices = computed(() =>
  options.classifications.value
    .filter((classification) => classification.type === 'EXPENSE')
    .map((classification) => ({ value: classification.id, label: classification.name })),
)

const selectedCard = computed(() =>
  activeCards.cards.value.find((card) => card.id === form.values.card),
)
const selectedPeriod = computed(() =>
  options.periods.value.find((period) => period.id === form.values.financialPeriod),
)
const closedInvoice = computed(() => openInvoice.existing.value)

watch(
  () => [form.values.card, form.values.financialPeriod, updating.value] as const,
  ([card, financialPeriod, editing]) =>
    openInvoice.check(editing ? null : card, editing ? null : financialPeriod),
  { immediate: true },
)

const optionsReady = run(async () => {
  await Promise.all([activeCards.load(), options.load()])
})
</script>

<template>
  <FormCard
    :title="updating ? $t('card-purchase.form.title-edit') : $t('card-purchase.form.title-new')"
    :description="updating ? form.values.name : undefined"
    :loading="loadingRecord"
    :submitting="submitting"
    :dirty="dirty"
    :messages="messages"
    :fields="fields"
    :submit-label="updating ? t('form.save') : t('card-purchase.form.submit')"
    @submit="onSubmit"
    @back="changeToList"
  >
    <div v-if="openInvoice.missing.value" class="p-5 pb-0">
      <Alert variant="destructive" data-slot="no-open-invoice">
        <CircleAlert />
        <AlertTitle>
          {{
            $t(
              closedInvoice
                ? 'card-purchase.closed-invoice.title'
                : 'card-purchase.closed-invoice.title-missing',
              { card: selectedCard?.name, period: selectedPeriod?.name },
            )
          }}
        </AlertTitle>
        <AlertDescription>{{ $t('card-purchase.closed-invoice.description') }}</AlertDescription>
        <Button
          v-if="closedInvoice"
          as-child
          type="button"
          variant="outline"
          size="sm"
          class="col-start-2 mt-1.5 w-fit"
        >
          <RouterLink :to="{ name: 'invoices.detail', params: { id: closedInvoice.id } }">
            <CreditCard />{{ $t('card-purchase.closed-invoice.action') }}
          </RouterLink>
        </Button>
      </Alert>
    </div>
    <FormSection :title="$t('card-purchase.sections.card')">
      <SelectField
        name="card"
        :label="$t('card-purchase.form.card')"
        :options="cardChoices"
        :disabled="updating"
        required
      />
      <SelectField
        name="financialPeriod"
        :label="$t('card-purchase.form.period')"
        :options="periodChoices"
        :hint="$t('card-purchase.form.period-hint')"
        :disabled="updating"
        required
      />
    </FormSection>
    <FormSection :title="$t('card-purchase.sections.purchase')">
      <InputField
        name="name"
        :label="$t('card-purchase.form.name')"
        :placeholder="$t('card-purchase.form.name-example')"
        class="md:col-span-2"
        required
      />
      <InputField
        name="purchasedOn"
        type="date"
        :label="$t('card-purchase.form.purchased-on')"
        mono
        required
      />
      <MoneyField name="value" :label="$t('card-purchase.form.value')" required />
      <SelectField
        name="costCenter"
        :label="$t('card-purchase.form.cost-center')"
        :options="costCenterChoices"
        required
      />
      <SelectField
        name="classification"
        :label="$t('card-purchase.form.classification')"
        :options="classificationChoices"
        :hint="$t('card-purchase.form.classification-hint')"
        required
      />
    </FormSection>
  </FormCard>
</template>
