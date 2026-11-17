<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from '@/components/forms/FormCard.vue'
import InputField from '@/components/forms/InputField.vue'
import SearchSelectField from '@/components/forms/SearchSelectField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
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
const { loading } = storeToRefs(store)
const { wallets } = storeToRefs(walletsStore)

const form = useForm({ validationSchema: cardFormSchema, initialValues: cardFormDefaults })

const { messages, changeToList, onSubmit } = useCrudForm({
  routeName: 'cards',
  notices: { created: 'notification.card.created', updated: 'notification.card.updated' },
  id: () => props.id,
  form,
  findOne: store.findOne,
  toFormValues: toCardFormValues,
  create: (values) => store.create(toCardCreateForm(values)),
  update: (id, values) => store.update(id, toCardUpdateForm(values)),
})

const updating = computed(() => props.id !== undefined)
const cardTypes = computed(() => typeOptions('card', CARD_TYPES, t))
const walletOptions = computed(() =>
  wallets.value.map((wallet) => ({ id: wallet.id, label: wallet.name })),
)
const walletEnabled = computed(() => usesWallet(form.values.type))
const invoiceEnabled = computed(() => usesInvoice(form.values.type))
</script>

<template>
  <FormCard
    :title="updating ? $t('card.form.editing') : $t('card.form.new')"
    :loading="loading"
    :messages="messages"
    @submit="onSubmit"
    @back="changeToList"
  >
    <StatusToggle v-if="updating" name="active" />
    <div class="grid gap-4 md:grid-cols-3">
      <InputField name="name" :label="$t('card.form.name')" />
      <SelectField
        name="type"
        :label="$t('card.form.type')"
        :options="cardTypes"
        :placeholder="$t('card.form.type-placeholder')"
        :disabled="updating"
      />
      <SearchSelectField
        name="wallet"
        :label="$t('card.form.wallet')"
        :options="walletOptions"
        :placeholder="$t('card.form.wallet-search-placeholder')"
        :empty-message="$t('card.form.wallet-search-empty')"
        :disabled="!walletEnabled"
        @search="walletsStore.findByName"
      />
    </div>
    <div class="grid gap-4 md:grid-cols-3">
      <InputField
        name="invoicePaymentDay"
        type="number"
        :label="$t('card.form.invoice-payment-day')"
        :disabled="!invoiceEnabled"
      />
      <InputField name="lastFourDigits" :label="$t('card.form.last-four-digits')" :maxlength="4" />
      <InputField name="flag" :label="$t('card.form.flag')" />
    </div>
  </FormCard>
</template>
