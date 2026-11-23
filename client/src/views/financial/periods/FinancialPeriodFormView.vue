<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import { useCrudForm } from '@/composables/useCrudForm'
import {
  financialPeriodFormSchema,
  toFinancialPeriodCreateForm,
  toFinancialPeriodFormValues,
  toFinancialPeriodUpdateForm,
} from '@/schemas/financialPeriodSchema'
import { useFinancialPeriodsStore } from '@/stores/financialPeriods'

const props = defineProps<{ id?: string }>()

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
  redirectToDetail: true,
})

const updating = computed(() => props.id !== undefined)
</script>

<template>
  <FormCard
    :title="updating ? $t('financial-period.form.editing') : $t('financial-period.form.new')"
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
    <FormSection
      :title="$t('financial-period.sections.identification')"
      :description="$t('financial-period.sections.identification-help')"
    >
      <InputField
        name="name"
        :label="$t('financial-period.form.name')"
        required
        class="md:col-span-2"
      />
    </FormSection>
    <FormSection
      :title="$t('financial-period.sections.dates')"
      :description="updating ? $t('financial-period.sections.dates-help') : undefined"
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
  </FormCard>
</template>
