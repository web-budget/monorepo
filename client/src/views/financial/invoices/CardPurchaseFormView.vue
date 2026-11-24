<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { cardsApi } from '@/api/cards'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import { useCrudForm } from '@/composables/useCrudForm'
import { useMovementFilterOptions } from '@/composables/useMovementFilterOptions'
import {
  cardPurchaseFormDefaults,
  cardPurchaseFormSchema,
  toCardPurchaseCreateForm,
  toCardPurchaseFormValues,
  toCardPurchaseUpdateForm,
} from '@/schemas/cardPurchaseSchema'
import { useCardPurchasesStore } from '@/stores/cardPurchases'
import type { CardListView } from '@/types'
import { defaultPeriod } from '@/utils/movements'
import { queryValue } from '@/utils/queryValue'

const OPTIONS_PAGE_SIZE = 100

const props = defineProps<{ id?: string }>()

const { t } = useI18n()
const route = useRoute()
const store = useCardPurchasesStore()
const options = useMovementFilterOptions()
const cards = ref<CardListView[]>([])

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
  })

const updating = computed(() => props.id !== undefined)

const cardChoices = computed(() =>
  cards.value.map((card) => ({ value: card.id, label: card.name })),
)
const periodChoices = computed(() =>
  options.periods.value
    .filter((period) => period.status === 'OPEN' || period.id === form.values.financialPeriod)
    .map((period) => ({ value: period.id, label: period.name })),
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

onMounted(async () => {
  await run(async () => {
    const [cardPage] = await Promise.all([
      cardsApi.findAll({ status: 'ACTIVE', size: OPTIONS_PAGE_SIZE, sort: 'name,asc' }),
      options.load(),
    ])
    cards.value = cardPage.content
  })
  if (updating.value) {
    return
  }
  const card = queryValue(route.query.card)
  if (cards.value.some((candidate) => candidate.id === card)) {
    form.setFieldValue('card', card)
  }
  const openPeriods = options.periods.value.filter((period) => period.status === 'OPEN')
  const requested = queryValue(route.query.period)
  const period =
    openPeriods.find((candidate) => candidate.id === requested) ?? defaultPeriod(openPeriods)
  if (period) {
    form.setFieldValue('financialPeriod', period.id)
  }
})
</script>

<template>
  <FormCard
    :title="updating ? $t('card-purchase.form.editing') : $t('card-purchase.form.new')"
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
    <FormSection
      :title="$t('card-purchase.sections.card')"
      :description="$t('card-purchase.sections.card-help')"
    >
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
        :disabled="updating"
        required
      />
    </FormSection>
    <FormSection :title="$t('card-purchase.sections.purchase')">
      <InputField
        name="name"
        :label="$t('card-purchase.form.name')"
        class="md:col-span-2"
        required
      />
      <InputField
        name="purchasedOn"
        type="date"
        :label="$t('card-purchase.form.purchased-on')"
        mono
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
        required
      />
    </FormSection>
  </FormCard>
</template>
