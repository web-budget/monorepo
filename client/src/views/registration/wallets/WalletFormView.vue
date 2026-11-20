<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import StatusSection from '@/components/forms/StatusSection.vue'
import { useCrudForm } from '@/composables/useCrudForm'
import {
  hasBankData,
  toWalletCreateForm,
  toWalletFormValues,
  toWalletUpdateForm,
  WALLET_TYPES,
  walletFormDefaults,
  walletFormSchema,
} from '@/schemas/walletSchema'
import { useWalletsStore } from '@/stores/wallets'
import { typeOptions } from '@/utils/typeLabels'

const props = defineProps<{ id?: string }>()

const { t } = useI18n()

const store = useWalletsStore()

const form = useForm({ validationSchema: walletFormSchema, initialValues: walletFormDefaults })

const { messages, fields, submitting, loadingRecord, dirty, changeToList, onSubmit } = useCrudForm({
  routeName: 'wallets',
  entity: 'wallet',
  id: () => props.id,
  form,
  findOne: store.findOne,
  toFormValues: toWalletFormValues,
  create: (values) => store.create(toWalletCreateForm(values)),
  update: (id, values) => store.update(id, toWalletUpdateForm(values)),
  redirectToDetail: true,
})

const updating = computed(() => props.id !== undefined)
const bankEnabled = computed(() => hasBankData(form.values.type))
const walletTypes = computed(() => typeOptions('wallet', WALLET_TYPES, t))
</script>

<template>
  <FormCard
    :title="updating ? $t('wallet.form.editing') : $t('wallet.form.new')"
    :description="updating ? form.values.name : undefined"
    :loading="loadingRecord"
    :submitting="submitting"
    :dirty="dirty"
    :messages="messages"
    :fields="fields"
    :submit-label="updating ? $t('crud.save-changes') : $t('wallet.form.create')"
    @submit="onSubmit"
    @back="changeToList"
  >
    <StatusSection
      v-if="updating"
      name="active"
      :label="$t('wallet.form.active-label')"
      :hint="$t('wallet.form.active-hint')"
    />
    <FormSection
      :title="$t('wallet.sections.identification')"
      :description="
        updating ? $t('wallet.form.type-hint') : $t('wallet.sections.identification-help')
      "
    >
      <InputField name="name" :label="$t('wallet.form.name')" required />
      <SelectField
        name="type"
        :label="$t('wallet.form.type')"
        :options="walletTypes"
        :placeholder="$t('wallet.form.type-placeholder')"
        :disabled="updating"
        required
      />
      <InputField
        name="description"
        :label="$t('wallet.form.description')"
        multiline
        class="md:col-span-2"
      />
    </FormSection>
    <FormSection
      v-if="bankEnabled"
      :title="$t('wallet.sections.bank')"
      :description="$t('wallet.sections.bank-help')"
      columns="md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.3fr)]"
      conditional
    >
      <InputField name="bank" :label="$t('wallet.form.bank')" />
      <InputField name="agency" :label="$t('wallet.form.agency')" mono />
      <InputField name="number" :label="$t('wallet.form.number')" mono />
    </FormSection>
  </FormCard>
</template>
