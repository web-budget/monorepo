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
const { loading } = storeToRefs(store)

const form = useForm({ validationSchema: walletFormSchema, initialValues: walletFormDefaults })

const { messages, changeToList, onSubmit } = useCrudForm({
  routeName: 'wallets',
  notices: { created: 'notification.wallet.created', updated: 'notification.wallet.updated' },
  id: () => props.id,
  form,
  findOne: store.findOne,
  toFormValues: toWalletFormValues,
  create: (values) => store.create(toWalletCreateForm(values)),
  update: (id, values) => store.update(id, toWalletUpdateForm(values)),
})

const updating = computed(() => props.id !== undefined)
const bankEnabled = computed(() => hasBankData(form.values.type))
const walletTypes = computed(() => typeOptions('wallet', WALLET_TYPES, t))
</script>

<template>
  <FormCard
    :title="updating ? $t('wallet.form.editing') : $t('wallet.form.new')"
    :loading="loading"
    :messages="messages"
    @submit="onSubmit"
    @back="changeToList"
  >
    <StatusToggle v-if="updating" name="active" />
    <div class="grid gap-4 md:grid-cols-2">
      <InputField name="name" :label="$t('wallet.form.name')" />
      <SelectField
        name="type"
        :label="$t('wallet.form.type')"
        :options="walletTypes"
        :placeholder="$t('wallet.form.type-placeholder')"
        :disabled="updating"
      />
    </div>
    <div class="grid gap-4 md:grid-cols-4">
      <div class="md:col-span-2">
        <InputField name="bank" :label="$t('wallet.form.bank')" :disabled="!bankEnabled" />
      </div>
      <InputField name="agency" :label="$t('wallet.form.agency')" :disabled="!bankEnabled" />
      <InputField name="number" :label="$t('wallet.form.number')" :disabled="!bankEnabled" />
    </div>
    <InputField name="description" :label="$t('wallet.form.description')" multiline />
  </FormCard>
</template>
