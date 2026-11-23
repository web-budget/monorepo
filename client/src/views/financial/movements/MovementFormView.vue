<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
import { Badge } from '@/components/ui/badge'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useCrudForm } from '@/composables/useCrudForm'
import { useMovementFilterOptions } from '@/composables/useMovementFilterOptions'
import {
  MOVEMENT_TYPES,
  movementFormDefaults,
  movementFormSchema,
  toMovementCreateForm,
  toMovementFormValues,
  toMovementUpdateForm,
} from '@/schemas/movementSchema'
import { useMovementsStore } from '@/stores/movements'
import { defaultPeriod } from '@/utils/movements'

const props = defineProps<{ id?: string }>()

const { t } = useI18n()

const store = useMovementsStore()
const options = useMovementFilterOptions()
const activeWallets = useActiveWallets()

const form = useForm({
  validationSchema: movementFormSchema,
  initialValues: movementFormDefaults(),
})

const { messages, fields, submitting, loadingRecord, dirty, changeToList, onSubmit, run } =
  useCrudForm({
    routeName: 'movements',
    entity: 'movement',
    id: () => props.id,
    form,
    findOne: store.findOne,
    toFormValues: toMovementFormValues,
    create: (values) => store.create(toMovementCreateForm(values)),
    update: (id, values) => store.update(id, toMovementUpdateForm(values)),
    redirectToDetail: true,
  })

const updating = computed(() => props.id !== undefined)

const typeChoices = computed(() =>
  MOVEMENT_TYPES.map((type) => ({ value: type, label: t(`movement.type.${type}`) })),
)
const periodChoices = computed(() =>
  options.periods.value
    .filter((period) => period.status === 'OPEN' || period.id === form.values.financialPeriod)
    .map((period) => ({
      value: period.id,
      label: period.expired
        ? `${period.name} · ${t('financial-period.status.expired')}`
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
    .filter((classification) => classification.type === form.values.type)
    .map((classification) => ({ value: classification.id, label: classification.name })),
)
const walletChoices = computed(() =>
  activeWallets.wallets.value.map((wallet) => ({ value: wallet.id, label: wallet.name })),
)
const submitLabel = computed(() => {
  if (updating.value) {
    return t('form.save')
  }
  return t(form.values.paid ? 'movement.form.submit-post-paid' : 'movement.form.submit-post')
})

onMounted(async () => {
  await run(async () => {
    await Promise.all([options.load(), activeWallets.load()])
  })
  const period = defaultPeriod(
    options.periods.value.filter((candidate) => candidate.status === 'OPEN'),
  )
  if (!updating.value && period && !form.values.financialPeriod) {
    form.setFieldValue('financialPeriod', period.id)
  }
})
</script>

<template>
  <FormCard
    :title="updating ? $t('movement.form.editing') : $t('movement.form.new')"
    :description="updating ? form.values.name : undefined"
    :loading="loadingRecord"
    :submitting="submitting"
    :dirty="dirty"
    :messages="messages"
    :fields="fields"
    :submit-label="submitLabel"
    @submit="onSubmit"
    @back="changeToList"
  >
    <FormSection
      :title="$t('movement.sections.type')"
      :description="updating ? $t('movement.form.type-hint') : undefined"
    >
      <Badge v-if="updating" :variant="form.values.type === 'INCOME' ? 'approved' : 'neutral'">
        {{ $t(`movement.type.${form.values.type}`) }}
      </Badge>
      <SelectField
        v-else
        name="type"
        :label="$t('movement.form.type')"
        :options="typeChoices"
        required
      />
    </FormSection>
    <FormSection :title="$t('movement.sections.identification')">
      <InputField name="name" :label="$t('movement.form.name')" required />
      <MoneyField name="value" :label="$t('movement.form.value')" required />
      <InputField
        name="dueDate"
        type="date"
        :label="$t('movement.form.due-date')"
        :hint="$t('movement.form.due-date-hint')"
        mono
      />
      <SelectField
        name="financialPeriod"
        :label="$t('movement.form.period')"
        :options="periodChoices"
        :disabled="updating"
        required
      />
      <InputField
        name="description"
        :label="$t('movement.form.description')"
        multiline
        class="md:col-span-2"
      />
    </FormSection>
    <FormSection
      :title="$t('movement.sections.classification')"
      :description="$t('movement.sections.classification-help')"
    >
      <SelectField
        name="costCenter"
        :label="$t('movement.form.cost-center')"
        :options="costCenterChoices"
        required
      />
      <SelectField
        name="classification"
        :label="$t('movement.form.classification')"
        :options="classificationChoices"
        required
      />
    </FormSection>
    <FormSection
      v-if="!updating"
      :title="$t('movement.sections.payment')"
      :description="$t('movement.sections.payment-help')"
    >
      <StatusToggle
        name="paid"
        :label="$t('movement.form.paid')"
        :heading="$t('movement.sections.payment')"
      />
      <template v-if="form.values.paid">
        <InputField name="paidOn" type="date" :label="$t('movement.form.paid-on')" mono required />
        <SelectField
          name="wallet"
          :label="$t('movement.form.wallet')"
          :options="walletChoices"
          required
        />
        <MoneyField
          name="discount"
          :label="$t('movement.form.discount')"
          :hint="$t('movement.form.discount-hint')"
        />
      </template>
    </FormSection>
  </FormCard>
</template>
