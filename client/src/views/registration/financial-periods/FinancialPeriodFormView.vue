<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import FormCard from '@/components/forms/FormCard.vue'
import InputField from '@/components/forms/InputField.vue'
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
const { loading } = storeToRefs(store)

const form = useForm({ validationSchema: financialPeriodFormSchema })

const { messages, changeToList, onSubmit } = useCrudForm({
  routeName: 'financial-periods',
  notices: {
    created: 'notification.financial-period.created',
    updated: 'notification.financial-period.updated',
  },
  id: () => props.id,
  form,
  findOne: store.findOne,
  toFormValues: toFinancialPeriodFormValues,
  create: (values) => store.create(toFinancialPeriodCreateForm(values)),
  update: (id, values) => store.update(id, toFinancialPeriodUpdateForm(values)),
})

const updating = computed(() => props.id !== undefined)
</script>

<template>
  <FormCard
    :title="updating ? $t('financial-period.form.editing') : $t('financial-period.form.new')"
    :loading="loading"
    :messages="messages"
    @submit="onSubmit"
    @back="changeToList"
  >
    <InputField name="name" :label="$t('financial-period.form.name')" />
    <div class="grid gap-4 md:grid-cols-4">
      <InputField
        name="startingAt"
        type="date"
        :label="$t('financial-period.form.starting-at')"
        :disabled="updating"
      />
      <InputField
        name="endingAt"
        type="date"
        :label="$t('financial-period.form.ending-at')"
        :disabled="updating"
      />
      <InputField
        name="revenuesGoal"
        type="number"
        :label="$t('financial-period.form.revenues-goal')"
      />
      <InputField
        name="expensesGoal"
        type="number"
        :label="$t('financial-period.form.expenses-goal')"
      />
    </div>
  </FormCard>
</template>
