<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import SearchSelectField from '@/components/forms/SearchSelectField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import StatusSection from '@/components/forms/StatusSection.vue'
import { useCrudForm } from '@/composables/useCrudForm'
import {
  CARD_TYPES,
  cardFormDefaults,
  cardFormSchema,
  toCardCreateForm,
  toCardFormValues,
  toCardUpdateForm,
  usesInvoice,
  usesWallet,
} from '@/schemas/cardSchema'
import { useCardsStore } from '@/stores/cards'
import { useWalletsStore } from '@/stores/wallets'
import { typeOptions } from '@/utils/typeLabels'

const props = defineProps<{ id?: string }>()

const { t } = useI18n()

const store = useCardsStore()
const walletsStore = useWalletsStore()
const { wallets } = storeToRefs(walletsStore)

const form = useForm({ validationSchema: cardFormSchema, initialValues: cardFormDefaults })

const { messages, fields, submitting, loadingRecord, dirty, changeToList, onSubmit, run } =
  useCrudForm({
    routeName: 'cards',
    entity: 'card',
    id: () => props.id,
    form,
    findOne: store.findOne,
    toFormValues: toCardFormValues,
    create: (values) => store.create(toCardCreateForm(values)),
    update: (id, values) => store.update(id, toCardUpdateForm(values)),
    redirectToDetail: true,
  })

const updating = computed(() => props.id !== undefined)
const cardTypes = computed(() => typeOptions('card', CARD_TYPES, t))
const walletOptions = computed(() =>
  wallets.value.map((wallet) => ({ id: wallet.id, label: wallet.name })),
)
const typeChosen = computed(() => form.values.type !== undefined)
const walletEnabled = computed(() => typeChosen.value && usesWallet(form.values.type))
const invoiceEnabled = computed(() => typeChosen.value && usesInvoice(form.values.type))
</script>

<template>
  <FormCard
    :title="updating ? $t('card.form.editing') : $t('card.form.new')"
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
      :label="$t('card.form.active-label')"
      :hint="$t('card.form.active-hint')"
    />
    <FormSection
      :title="$t('card.sections.identification')"
      :description="updating ? $t('card.form.type-hint') : $t('card.sections.identification-help')"
    >
      <InputField name="name" :label="$t('card.form.name')" required />
      <SelectField
        name="type"
        :label="$t('card.form.type')"
        :options="cardTypes"
        :placeholder="$t('card.form.type-placeholder')"
        :disabled="updating"
        required
      />
      <InputField
        name="lastFourDigits"
        :label="$t('card.form.last-four-digits')"
        :maxlength="4"
        mono
        required
      />
      <InputField name="flag" :label="$t('card.form.flag')" />
    </FormSection>
    <FormSection
      v-if="walletEnabled"
      :title="$t('card.sections.wallet')"
      :description="$t('card.sections.wallet-help')"
      conditional
    >
      <SearchSelectField
        name="wallet"
        :label="$t('card.form.wallet')"
        :options="walletOptions"
        :placeholder="$t('card.form.wallet-search-placeholder')"
        :empty-message="$t('card.form.wallet-search-empty')"
        @search="(text) => run(() => walletsStore.findByName(text))"
      />
    </FormSection>
    <FormSection
      v-if="invoiceEnabled"
      :title="$t('card.sections.invoice')"
      :description="$t('card.sections.invoice-help')"
      conditional
    >
      <InputField
        name="invoicePaymentDay"
        type="number"
        :label="$t('card.form.invoice-payment-day')"
        mono
      />
    </FormSection>
  </FormCard>
</template>
