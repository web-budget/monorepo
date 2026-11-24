<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import StatusSection from '@/components/forms/StatusSection.vue'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useCrudForm } from '@/composables/useCrudForm'
import {
  CARD_FLAGS,
  cardFormDefaults,
  cardFormSchema,
  toCardCreateForm,
  toCardFormValues,
  toCardUpdateForm,
} from '@/schemas/cardSchema'
import { useCardsStore } from '@/stores/cards'

const props = defineProps<{ id?: string }>()

const { t } = useI18n()
const store = useCardsStore()
const activeWallets = useActiveWallets()

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

const flagOptions = computed(() => {
  const current = form.values.flag
  const flags = current && !CARD_FLAGS.includes(current) ? [...CARD_FLAGS, current] : CARD_FLAGS
  return flags.map((flag) => ({ value: flag, label: flag }))
})

const walletOptions = computed(() => {
  const wallets = activeWallets.wallets.value.map((wallet) => ({
    value: wallet.id,
    label: wallet.name,
  }))
  const current = updating.value ? store.card?.wallet : undefined
  return current && !wallets.some((wallet) => wallet.value === current.id)
    ? [...wallets, { value: current.id, label: current.name }]
    : wallets
})

onMounted(() => run(() => activeWallets.load()))
</script>

<template>
  <FormCard
    :title="updating ? $t('card.form.title-edit') : $t('card.form.title-new')"
    :description="updating ? form.values.name : $t('card.form.description')"
    :loading="loadingRecord"
    :submitting="submitting"
    :dirty="dirty"
    :messages="messages"
    :fields="fields"
    :submit-label="updating ? t('form.save') : t('form.create')"
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
      columns="md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]"
    >
      <InputField
        name="name"
        :label="$t('card.form.name')"
        :placeholder="$t('card.form.name-example')"
        required
      />
      <SelectField name="flag" :label="$t('card.form.flag')" :options="flagOptions" />
      <InputField
        name="lastFourDigits"
        :label="$t('card.form.last-four-digits')"
        :placeholder="$t('card.form.last-four-digits-example')"
        :maxlength="4"
        mono
        required
      />
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
      <SelectField
        name="wallet"
        :label="$t('card.form.wallet')"
        :options="walletOptions"
        :none-label="$t('card.form.wallet-placeholder')"
        :hint="$t('card.form.wallet-hint')"
      />
    </FormSection>
  </FormCard>
</template>
