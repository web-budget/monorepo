<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import StatusSection from '@/components/forms/StatusSection.vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
import { Badge } from '@/components/ui/badge'
import { useActiveCards } from '@/composables/useActiveCards'
import { useCrudForm } from '@/composables/useCrudForm'
import { useMovementFilterOptions } from '@/composables/useMovementFilterOptions'
import { MOVEMENT_TYPES } from '@/schemas/movementSchema'
import {
  NO_CARD,
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
const activeCards = useActiveCards()

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
const expense = computed(() => form.values.type === 'EXPENSE')
const variable = computed(() => form.values.valueKind === 'VARIABLE')

const typeChoices = computed(() =>
  MOVEMENT_TYPES.map((type) => ({ value: type, label: t(`movement.type.${type}`) })),
)
const valueKindChoices = computed(() =>
  RECURRING_VALUE_KINDS.map((kind) => ({
    value: kind,
    label: t(`recurrent-movement.value-kind.${kind}`),
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
const cardChoices = computed(() => [
  { value: NO_CARD, label: t('recurrent-movement.form.no-card') },
  ...activeCards.cards.value.map((card) => ({ value: card.id, label: card.name })),
])

onMounted(() =>
  run(async () => {
    await Promise.all([options.load(), activeCards.load()])
  }),
)
</script>

<template>
  <FormCard
    :title="updating ? $t('recurrent-movement.form.editing') : $t('recurrent-movement.form.new')"
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
      <Badge v-if="updating" :variant="expense ? 'neutral' : 'approved'">
        {{ $t(`movement.type.${form.values.type}`) }}
      </Badge>
      <SelectField
        v-else
        name="type"
        :label="$t('recurrent-movement.form.type')"
        :options="typeChoices"
        required
      />
    </FormSection>
    <FormSection :title="$t('recurrent-movement.sections.identification')">
      <InputField name="name" :label="$t('recurrent-movement.form.name')" required />
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
      <SelectField
        name="costCenter"
        :label="$t('recurrent-movement.form.cost-center')"
        :options="costCenterChoices"
        required
      />
      <SelectField
        name="classification"
        :label="$t(`recurrent-movement.form.classification-of-type.${form.values.type}`)"
        :options="classificationChoices"
        required
      />
    </FormSection>
    <FormSection
      :title="$t('recurrent-movement.sections.value-kind')"
      :description="$t('recurrent-movement.form.value-kind-hint')"
    >
      <SelectField
        name="valueKind"
        :label="$t('recurrent-movement.form.value-kind')"
        :options="valueKindChoices"
        :disabled="updating"
        required
      />
    </FormSection>
    <FormSection
      :title="$t('recurrent-movement.sections.repetition')"
      :description="$t('recurrent-movement.form.repetition-hint')"
    >
      <StatusToggle
        name="indefinite"
        :label="$t('recurrent-movement.form.indefinite')"
        :heading="$t('recurrent-movement.form.installments-heading')"
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
          mono
        />
      </template>
    </FormSection>
    <FormSection
      v-if="expense"
      :title="$t('recurrent-movement.sections.card')"
      :description="$t('recurrent-movement.form.card-hint')"
    >
      <SelectField
        name="card"
        :label="$t('recurrent-movement.form.card')"
        :options="cardChoices"
        :placeholder="$t('recurrent-movement.form.no-card')"
      />
    </FormSection>
    <FormSection :title="$t('recurrent-movement.sections.launch')">
      <StatusToggle
        name="autoLaunch"
        :label="$t('recurrent-movement.form.auto-launch')"
        :hint="$t('recurrent-movement.form.auto-launch-hint')"
        :heading="$t('recurrent-movement.sections.launch')"
      />
    </FormSection>
  </FormCard>
</template>
