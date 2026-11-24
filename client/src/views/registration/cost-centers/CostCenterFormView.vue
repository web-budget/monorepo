<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import SearchSelectField from '@/components/forms/SearchSelectField.vue'
import StatusSection from '@/components/forms/StatusSection.vue'
import { useCrudForm } from '@/composables/useCrudForm'
import {
  costCenterFormDefaults,
  costCenterFormSchema,
  toCostCenterCreateForm,
  toCostCenterFormValues,
  toCostCenterUpdateForm,
} from '@/schemas/costCenterSchema'
import { useCostCentersStore } from '@/stores/costCenters'

const props = defineProps<{ id?: string }>()

const store = useCostCentersStore()
const { costCenters } = storeToRefs(store)

const form = useForm({
  validationSchema: costCenterFormSchema,
  initialValues: costCenterFormDefaults,
})

const { messages, fields, submitting, loadingRecord, dirty, changeToList, onSubmit, run } =
  useCrudForm({
    routeName: 'cost-centers',
    entity: 'cost-center',
    id: () => props.id,
    form,
    findOne: store.findOne,
    toFormValues: toCostCenterFormValues,
    create: (values) => store.create(toCostCenterCreateForm(values)),
    update: (id, values) => store.update(id, toCostCenterUpdateForm(values)),
    detailAfterUpdate: true,
  })

const updating = computed(() => props.id !== undefined)
const parentOptions = computed(() =>
  costCenters.value
    .filter((costCenter) => costCenter.id !== props.id)
    .map((costCenter) => ({ id: costCenter.id, label: costCenter.fullName })),
)
</script>

<template>
  <FormCard
    :title="updating ? $t('cost-center.form.editing') : $t('cost-center.form.new')"
    :description="updating ? form.values.name : undefined"
    :loading="loadingRecord"
    :submitting="submitting"
    :dirty="dirty"
    :messages="messages"
    :fields="fields"
    :submit-label="updating ? $t('form.save') : $t('form.create')"
    @submit="onSubmit"
    @back="changeToList"
  >
    <StatusSection
      v-if="updating"
      name="active"
      :label="$t('cost-center.form.active-label')"
      :hint="$t('cost-center.form.active-hint')"
    />
    <FormSection
      :title="$t('cost-center.sections.identification')"
      :description="$t('cost-center.sections.identification-help')"
    >
      <InputField name="name" :label="$t('cost-center.form.name')" required />
      <SearchSelectField
        name="parentCostCenter"
        :label="$t('cost-center.form.parent')"
        :options="parentOptions"
        :placeholder="$t('cost-center.form.parent-search-placeholder')"
        :empty-message="$t('cost-center.form.parent-search-empty')"
        @search="(text) => run(() => store.findByName(text))"
      />
      <InputField
        name="description"
        :label="$t('cost-center.form.description')"
        multiline
        class="md:col-span-2"
      />
    </FormSection>
    <FormSection
      :title="$t('cost-center.sections.budget')"
      :description="$t('cost-center.sections.budget-help')"
    >
      <MoneyField name="incomeBudget" :label="$t('cost-center.form.income-budget')" />
      <MoneyField name="expenseBudget" :label="$t('cost-center.form.expense-budget')" />
    </FormSection>
  </FormCard>
</template>
