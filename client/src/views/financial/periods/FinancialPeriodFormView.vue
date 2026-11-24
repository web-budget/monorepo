<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import PeriodCreationPreview from '@/components/periods/PeriodCreationPreview.vue'
import { useCrudForm } from '@/composables/useCrudForm'
import {
  financialPeriodFormSchema,
  toFinancialPeriodCreateForm,
  toFinancialPeriodFormValues,
  toFinancialPeriodUpdateForm,
} from '@/schemas/financialPeriodSchema'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'

const props = defineProps<{ id?: string }>()

const { t } = useI18n()

const store = useFinancialPeriodsStore()

const form = useForm({ validationSchema: financialPeriodFormSchema })

const { messages, fields, submitting, loadingRecord, dirty, changeToList, onSubmit } = useCrudForm({
  routeName: 'financial-periods',
  entity: 'financial-period',
  id: () => props.id,
  form,
  findOne: store.findOne,
  toFormValues: toFinancialPeriodFormValues,
  create: (values) => store.create(toFinancialPeriodCreateForm(values)),
  update: (id, values) => store.update(id, toFinancialPeriodUpdateForm(values)),
  detailAfterUpdate: true,
  successDetail: (updating) =>
    updating ? 'financial-period.toast.updated-detail' : 'financial-period.toast.created-detail',
  createDefaults: store.findNextDates,
  toastParams: () => ({
    launched: t('financial-period.toast.launched-count', store.recurringLaunch.launched.length),
    invoices: t('financial-period.toast.invoices-count', store.openedInvoices),
  }),
})

const updating = computed(() => props.id !== undefined)

const showPreview = computed(
  () =>
    !updating.value &&
    (store.creationPreview.recurringMovements.length > 0 ||
      store.creationPreview.invoices.length > 0),
)

onMounted(() => {
  if (!updating.value) {
    return store.findCreationPreview()
  }
})
</script>

<template>
  <FormCard
    :title="
      updating ? $t('financial-period.form.title-editing') : $t('financial-period.form.title-new')
    "
    :description="updating ? form.values.name : undefined"
    :loading="loadingRecord"
    :submitting="submitting"
    :dirty="dirty"
    :messages="messages"
    :fields="fields"
    :submit-label="updating ? $t('form.save') : $t('form.create')"
    wide-aside
    @submit="onSubmit"
    @back="changeToList"
  >
    <FormSection :title="$t('financial-period.sections.identification')">
      <InputField
        name="name"
        :label="$t('financial-period.form.name')"
        :placeholder="$t('financial-period.form.name-example')"
        required
        class="md:col-span-2"
      />
    </FormSection>
    <FormSection
      :title="$t('financial-period.sections.dates')"
      :description="$t('financial-period.sections.dates-help')"
    >
      <InputField
        name="startingAt"
        type="date"
        :label="$t('financial-period.form.starting-at')"
        :disabled="updating"
        mono
        required
      />
      <InputField
        name="endingAt"
        type="date"
        :label="$t('financial-period.form.ending-at')"
        :disabled="updating"
        mono
        required
      />
    </FormSection>
    <FormSection
      :title="$t('financial-period.sections.goals')"
      :description="$t('financial-period.sections.goals-help')"
    >
      <MoneyField name="revenuesGoal" :label="$t('financial-period.form.revenues-goal')" />
      <MoneyField name="expensesGoal" :label="$t('financial-period.form.expenses-goal')" />
    </FormSection>
    <template v-if="showPreview" #aside>
      <PeriodCreationPreview :preview="store.creationPreview" />
    </template>
  </FormCard>
</template>
