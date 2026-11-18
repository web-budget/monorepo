<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
import { useCrudForm } from '@/composables/useCrudForm'
import {
  CLASSIFICATION_TYPES,
  classificationFormDefaults,
  classificationFormSchema,
  toClassificationCreateForm,
  toClassificationFormValues,
  toClassificationUpdateForm,
} from '@/schemas/classificationSchema'
import { useClassificationsStore } from '@/stores/classifications'
import { typeOptions } from '@/utils/typeLabels'

const props = defineProps<{ id?: string }>()

const { t } = useI18n()

const store = useClassificationsStore()

const form = useForm({
  validationSchema: classificationFormSchema,
  initialValues: classificationFormDefaults,
})

const { messages, fields, submitting, loadingRecord, dirty, changeToList, onSubmit } = useCrudForm({
  routeName: 'classifications',
  entity: 'classification',
  id: () => props.id,
  form,
  findOne: store.findOne,
  toFormValues: toClassificationFormValues,
  create: (values) => store.create(toClassificationCreateForm(values)),
  update: (id, values) => store.update(id, toClassificationUpdateForm(values)),
  redirectToDetail: true,
})

const updating = computed(() => props.id !== undefined)
const classificationTypes = computed(() => typeOptions('classification', CLASSIFICATION_TYPES, t))
</script>

<template>
  <FormCard
    :title="updating ? $t('classification.form.editing') : $t('classification.form.new')"
    :description="updating ? form.values.name : undefined"
    :loading="loadingRecord"
    :submitting="submitting"
    :dirty="dirty"
    :messages="messages"
    :fields="fields"
    :submit-label="updating ? $t('crud.save-changes') : $t('classification.form.create')"
    @submit="onSubmit"
    @back="changeToList"
  >
    <FormSection
      :title="$t('classification.sections.identification')"
      :description="
        updating
          ? $t('classification.form.type-hint')
          : $t('classification.sections.identification-help')
      "
    >
      <InputField name="name" :label="$t('classification.form.name')" required />
      <SelectField
        name="type"
        :label="$t('classification.form.type')"
        :options="classificationTypes"
        :placeholder="$t('classification.form.type-placeholder')"
        :disabled="updating"
        required
      />
      <StatusToggle
        v-if="updating"
        name="active"
        :label="$t('classification.form.active-label')"
        :hint="$t('classification.form.active-hint')"
      />
      <InputField
        name="description"
        :label="$t('classification.form.description')"
        multiline
        class="md:col-span-2"
      />
    </FormSection>
    <FormSection
      :title="$t('classification.sections.budget')"
      :description="$t('classification.sections.budget-help')"
    >
      <InputField name="budget" type="number" :label="$t('classification.form.budget')" mono />
    </FormSection>
  </FormCard>
</template>
