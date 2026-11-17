<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from '@/components/forms/FormCard.vue'
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
const { loading } = storeToRefs(store)

const form = useForm({
  validationSchema: classificationFormSchema,
  initialValues: classificationFormDefaults,
})

const { messages, changeToList, onSubmit } = useCrudForm({
  routeName: 'classifications',
  notices: {
    created: 'notification.classification.created',
    updated: 'notification.classification.updated',
  },
  id: () => props.id,
  form,
  findOne: store.findOne,
  toFormValues: toClassificationFormValues,
  create: (values) => store.create(toClassificationCreateForm(values)),
  update: (id, values) => store.update(id, toClassificationUpdateForm(values)),
})

const updating = computed(() => props.id !== undefined)
const classificationTypes = computed(() => typeOptions('classification', CLASSIFICATION_TYPES, t))
</script>

<template>
  <FormCard
    :title="updating ? $t('classification.form.editing') : $t('classification.form.new')"
    :loading="loading"
    :messages="messages"
    @submit="onSubmit"
    @back="changeToList"
  >
    <StatusToggle v-if="updating" name="active" />
    <div class="grid gap-4 md:grid-cols-3">
      <InputField name="name" :label="$t('classification.form.name')" />
      <SelectField
        name="type"
        :label="$t('classification.form.type')"
        :options="classificationTypes"
        :placeholder="$t('classification.form.type-placeholder')"
        :disabled="updating"
      />
      <InputField name="budget" type="number" :label="$t('classification.form.budget')" />
    </div>
    <InputField name="description" :label="$t('classification.form.description')" multiline />
  </FormCard>
</template>
