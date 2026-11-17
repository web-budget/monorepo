<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import FormCard from '@/components/forms/FormCard.vue'
import InputField from '@/components/forms/InputField.vue'
import SearchSelectField from '@/components/forms/SearchSelectField.vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
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
const { costCenters, loading } = storeToRefs(store)

const form = useForm({
  validationSchema: costCenterFormSchema,
  initialValues: costCenterFormDefaults,
})

const { messages, changeToList, onSubmit } = useCrudForm({
  routeName: 'cost-centers',
  notices: {
    created: 'notification.cost-center.created',
    updated: 'notification.cost-center.updated',
  },
  id: () => props.id,
  form,
  findOne: store.findOne,
  toFormValues: toCostCenterFormValues,
  create: (values) => store.create(toCostCenterCreateForm(values)),
  update: (id, values) => store.update(id, toCostCenterUpdateForm(values)),
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
    :loading="loading"
    :messages="messages"
    @submit="onSubmit"
    @back="changeToList"
  >
    <StatusToggle v-if="updating" name="active" />
    <div class="grid gap-4 md:grid-cols-2">
      <InputField name="name" :label="$t('cost-center.form.name')" />
      <SearchSelectField
        name="parentCostCenter"
        :label="$t('cost-center.form.parent')"
        :options="parentOptions"
        :placeholder="$t('cost-center.form.parent-search-placeholder')"
        :empty-message="$t('cost-center.form.parent-search-empty')"
        @search="store.findByName"
      />
      <InputField name="incomeBudget" type="number" :label="$t('cost-center.form.income-budget')" />
      <InputField
        name="expenseBudget"
        type="number"
        :label="$t('cost-center.form.expense-budget')"
      />
    </div>
    <InputField name="description" :label="$t('cost-center.form.description')" multiline />
  </FormCard>
</template>
