<script setup lang="ts">
import { ArrowDownLeft, ArrowUpRight } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ChoiceCardsField from '@/components/forms/ChoiceCardsField.vue'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import RadioOptionsField from '@/components/forms/RadioOptionsField.vue'
import SegmentedField from '@/components/forms/SegmentedField.vue'
import ComboboxField from '@/components/forms/ComboboxField.vue'
import StatusSection from '@/components/forms/StatusSection.vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
import { Badge } from '@/components/ui/badge'
import { useCrudForm } from '@/composables/useCrudForm'
import { useMovementFilterOptions } from '@/composables/useMovementFilterOptions'
import {
  RECURRING_VALUE_KINDS,
  recurringMovementFormDefaults,
  recurringMovementFormSchema,
  toRecurringMovementCreateForm,
  toRecurringMovementFormValues,
  toRecurringMovementUpdateForm,
} from '@/schemas/recurringMovementSchema'
import { useRecurringMovementsStore } from '@/stores/recurringMovements'

const props = defineProps<{ id?: string }>()

const { t } = useI18n()

const store = useRecurringMovementsStore()
const options = useMovementFilterOptions()

const form = useForm({
  validationSchema: recurringMovementFormSchema,
  initialValues: recurringMovementFormDefaults(),
})

const { messages, fields, submitting, loadingRecord, dirty, changeToList, onSubmit, run } =
  useCrudForm({
    routeName: 'recurring-movements',
    entity: 'recurrent-movement',
    id: () => props.id,
    form,
    findOne: store.findOne,
    toFormValues: toRecurringMovementFormValues,
    create: (values) => store.create(toRecurringMovementCreateForm(values)),
    update: (id, values) => store.update(id, toRecurringMovementUpdateForm(values)),
    detailAfterUpdate: true,
  })

const updating = computed(() => props.id !== undefined)
const income = computed(() => form.values.type === 'INCOME')
const variable = computed(() => form.values.valueKind === 'VARIABLE')

const typeChoices = computed(() => [
  { value: 'EXPENSE', label: t('movement.type.expense'), icon: ArrowUpRight },
  { value: 'INCOME', label: t('movement.type.income'), icon: ArrowDownLeft },
])
const valueKindChoices = computed(() =>
  RECURRING_VALUE_KINDS.map((kind) => ({
    value: kind,
    label: t(`recurrent-movement.value-kind.${kind}`),
    description: t(`recurrent-movement.form.value-kind-description.${kind}`),
  })),
)
const repetitionChoices = computed(() => [
  { value: false, label: t('recurrent-movement.form.installments-heading') },
  { value: true, label: t('recurrent-movement.form.indefinite') },
])
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

onMounted(() => run(options.load))
</script>

<template>
  <FormCard
    :title="
      updating
        ? $t('recurrent-movement.form.title-editing')
        : $t('recurrent-movement.form.title-new')
    "
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
      :label="$t('recurrent-movement.form.active-label')"
      :hint="$t('recurrent-movement.form.active-hint')"
    />
    <FormSection
      :title="$t('recurrent-movement.sections.type')"
      :description="updating ? $t('recurrent-movement.form.type-hint') : undefined"
    >
      <Badge v-if="updating" :variant="income ? 'approved' : 'neutral'">
        {{ $t(`movement.type.${income ? 'income' : 'expense'}`) }}
      </Badge>
      <SegmentedField v-else name="type" :options="typeChoices" />
    </FormSection>
    <FormSection :title="$t('recurrent-movement.sections.identification')">
      <InputField
        name="name"
        :label="$t('recurrent-movement.form.name')"
        :placeholder="$t(`recurrent-movement.form.name-example.${income ? 'income' : 'expense'}`)"
        required
      />
      <MoneyField
        v-if="!updating"
        name="value"
        :label="
          $t(variable ? 'recurrent-movement.form.suggested-value' : 'recurrent-movement.form.value')
        "
        required
      />
      <p v-else class="text-muted-foreground self-end pb-2 text-sm" data-slot="value-note">
        {{ $t('recurrent-movement.form.value-note') }}
      </p>
      <ComboboxField
        name="costCenter"
        :label="$t('recurrent-movement.form.cost-center')"
        :options="costCenterChoices"
        :search-placeholder="$t('cost-center.combobox.search')"
        :empty-message="$t('cost-center.combobox.empty')"
        :loading="options.loading.value"
        required
      />
      <ComboboxField
        name="classification"
        :label="$t(`recurrent-movement.form.classification-of-type.${form.values.type}`)"
        :options="classificationChoices"
        :search-placeholder="$t('classification.combobox.search')"
        :empty-message="$t('classification.combobox.empty')"
        :loading="options.loading.value"
        required
      />
    </FormSection>
    <FormSection :title="$t('recurrent-movement.sections.value-kind')">
      <ChoiceCardsField
        name="valueKind"
        class="md:col-span-2"
        :label="$t('recurrent-movement.form.value-kind')"
        :options="valueKindChoices"
        :disabled="updating"
      />
    </FormSection>
    <FormSection
      :title="$t('recurrent-movement.sections.repetition')"
      :description="$t('recurrent-movement.form.repetition-hint')"
    >
      <RadioOptionsField
        name="indefinite"
        class="md:col-span-2"
        :label="$t('recurrent-movement.sections.repetition')"
        :options="repetitionChoices"
      />
      <template v-if="!form.values.indefinite">
        <InputField
          name="installments"
          type="number"
          :label="$t('recurrent-movement.form.installments')"
          mono
          required
        />
        <InputField
          v-if="!updating"
          name="firstInstallment"
          type="number"
          :label="$t('recurrent-movement.form.first-installment')"
          :hint="$t('recurrent-movement.form.first-installment-hint')"
          mono
          required
        />
      </template>
    </FormSection>
    <FormSection :title="$t('recurrent-movement.sections.launch')">
      <StatusToggle
        name="autoLaunch"
        :label="$t('recurrent-movement.form.auto-launch')"
        :hint="$t('recurrent-movement.form.auto-launch-hint')"
        heading=""
      />
    </FormSection>
  </FormCard>
</template>
