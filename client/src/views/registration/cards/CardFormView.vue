<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import SearchSelectField from '@/components/forms/SearchSelectField.vue'
import StatusSection from '@/components/forms/StatusSection.vue'
import { useCrudForm } from '@/composables/useCrudForm'
import {
  cardFormDefaults,
  cardFormSchema,
  toCardCreateForm,
  toCardFormValues,
  toCardUpdateForm,
} from '@/schemas/cardSchema'
import { useCardsStore } from '@/stores/cards'
import { useWalletsStore } from '@/stores/wallets'
import { walletLabel } from '@/utils/walletLabel'

const props = defineProps<{ id?: string }>()

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
    detailAfterUpdate: true,
  })

const updating = computed(() => props.id !== undefined)
const walletOptions = computed(() =>
  wallets.value.map((wallet) => ({ id: wallet.id, label: walletLabel(wallet) })),
)
</script>

<template>
  <FormCard
    :title="updating ? $t('card.form.title-editing') : $t('card.form.title-new')"
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
      :description="$t('card.sections.identification-help')"
    >
      <InputField name="name" :label="$t('card.form.name')" required />
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
      :title="$t('card.sections.invoice')"
      :description="$t('card.sections.invoice-help')"
    >
      <InputField
        name="invoicePaymentDay"
        type="number"
        :label="$t('card.form.invoice-payment-day')"
        mono
        required
      />
      <SearchSelectField
        name="wallet"
        :label="$t('card.form.wallet')"
        :options="walletOptions"
        :placeholder="$t('card.form.wallet-search-placeholder')"
        :empty-message="$t('card.form.wallet-search-empty')"
        @search="(text) => run(() => walletsStore.findByName(text))"
      />
    </FormSection>
  </FormCard>
</template>
