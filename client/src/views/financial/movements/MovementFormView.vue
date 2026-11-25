<script setup lang="ts">
import { ArrowDownLeft, ArrowUpRight, CircleAlert, CreditCard, Wallet } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import SegmentedField from '@/components/forms/SegmentedField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useActiveCards } from '@/composables/useActiveCards'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useCrudForm } from '@/composables/useCrudForm'
import { useMovementFilterOptions } from '@/composables/useMovementFilterOptions'
import { useOpenInvoice } from '@/composables/useOpenInvoice'
import {
  MOVEMENT_TYPES,
  movementFormDefaults,
  movementFormSchema,
  toMovementCreateForm,
  toMovementFormValues,
  toMovementUpdateForm,
} from '@/schemas/movementSchema'
import { useMovementsStore } from '@/stores/movements'
import { cardLabel } from '@/utils/invoices'
import { defaultPeriod } from '@/utils/movements'
import { formatBalance } from '@/utils/money'

const props = defineProps<{ id?: string }>()

const { t, n } = useI18n()

const store = useMovementsStore()
const options = useMovementFilterOptions()
const activeWallets = useActiveWallets()
const activeCards = useActiveCards()
const openInvoice = useOpenInvoice()

const form = useForm({
  validationSchema: movementFormSchema,
  initialValues: movementFormDefaults(),
})

const { messages, fields, submitting, loadingRecord, dirty, changeToList, onSubmit, run } =
  useCrudForm({
    routeName: 'movements',
    entity: 'movement',
    id: () => props.id,
    form,
    findOne: store.findOne,
    toFormValues: toMovementFormValues,
    create: (values) => store.create(toMovementCreateForm(values)),
    update: (id, values) => store.update(id, toMovementUpdateForm(values)),
    detailAfterUpdate: true,
    successDetail: (updating, values) => {
      if (updating) {
        return undefined
      }
      return values.paid ? 'movement.toast.created-paid-detail' : 'movement.toast.created-detail'
    },
  })

const updating = computed(() => props.id !== undefined)
const income = computed(() => form.values.type === 'INCOME')
const onCard = computed(() => !income.value && form.values.via === 'CARD')
const typeKey = computed(() => (income.value ? 'INCOME' : 'EXPENSE'))

const typeChoices = computed(() =>
  MOVEMENT_TYPES.map((type) => ({
    value: type,
    label: t(`movement.type.${type}`),
    icon: type === 'INCOME' ? ArrowDownLeft : ArrowUpRight,
  })),
)
const viaChoices = computed(() => [
  { value: 'WALLET', label: t('movement.pay.method.WALLET'), icon: Wallet },
  { value: 'CARD', label: t('movement.pay.method.CARD'), icon: CreditCard },
])
const periodChoices = computed(() =>
  options.periods.value
    .filter((period) => period.status === 'OPEN' || period.id === form.values.financialPeriod)
    .map((period) => {
      let suffix = ''
      if (period.expired) {
        suffix = ` · ${t('financial-period.status.expired-short')}`
      } else if (period.status === 'CLOSED') {
        suffix = ` · ${t('financial-period.status.closed-short')}`
      }
      return { value: period.id, label: `${period.name}${suffix}` }
    }),
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
const walletChoices = computed(() =>
  activeWallets.wallets.value.map((wallet) => ({
    value: wallet.id,
    label: t('movement.form.wallet-option', {
      name: wallet.name,
      balance: formatBalance(n, wallet.currentBalance),
    }),
  })),
)
const cardChoices = computed(() =>
  activeCards.cards.value.map((card) => ({ value: card.id, label: cardLabel(card) })),
)
const submitLabel = computed(() => {
  if (updating.value) {
    return t('form.save')
  }
  return t(form.values.paid ? 'movement.form.submit-post-paid' : 'movement.form.submit-post')
})
const selectedCard = computed(() =>
  activeCards.cards.value.find((card) => card.id === form.values.card),
)
const selectedPeriod = computed(() =>
  options.periods.value.find((period) => period.id === form.values.financialPeriod),
)

watch(
  () => [onCard.value, form.values.card, form.values.financialPeriod] as const,
  ([cardSelected, card, financialPeriod]) =>
    openInvoice.check(cardSelected ? card : null, financialPeriod),
)

onMounted(async () => {
  await run(async () => {
    await Promise.all([options.load(), activeWallets.load(), activeCards.load()])
  })
  if (updating.value) {
    return
  }
  const period = defaultPeriod(
    options.periods.value.filter((candidate) => candidate.status === 'OPEN'),
  )
  const defaults = {
    ...form.values,
    financialPeriod: form.values.financialPeriod ?? period?.id,
    wallet: form.values.wallet ?? activeWallets.wallets.value[0]?.id,
    card: form.values.card ?? activeCards.cards.value[0]?.id,
  }
  form.resetForm({ values: defaults })
})
</script>

<template>
  <FormCard
    :title="updating ? $t('movement.form.title-edit') : $t('movement.form.title-new')"
    :description="updating ? form.values.name : undefined"
    :loading="loadingRecord"
    :submitting="submitting"
    :dirty="dirty"
    :messages="messages"
    :fields="fields"
    :submit-label="submitLabel"
    @submit="onSubmit"
    @back="changeToList"
  >
    <FormSection
      :title="$t('movement.sections.type')"
      :description="updating ? $t('movement.form.type-hint') : undefined"
    >
      <Badge v-if="updating" :variant="form.values.type === 'INCOME' ? 'approved' : 'neutral'">
        {{ $t(`movement.type.${form.values.type}`) }}
      </Badge>
      <SegmentedField v-else name="type" :options="typeChoices" />
    </FormSection>
    <FormSection :title="$t('movement.sections.identification')">
      <InputField
        name="name"
        :label="$t('movement.form.name')"
        :placeholder="$t(`movement.form.name-example.${typeKey}`)"
        required
      />
      <MoneyField
        name="value"
        :label="$t('movement.form.value')"
        :hint="$t('movement.form.value-hint')"
        required
      />
      <InputField
        name="dueDate"
        type="date"
        :label="$t('movement.form.due-date')"
        :hint="$t('movement.form.due-date-hint')"
        mono
      />
      <SelectField
        name="financialPeriod"
        :label="$t('movement.form.period')"
        :options="periodChoices"
        :disabled="updating"
        :hint="$t('movement.form.period-hint')"
        required
      />
    </FormSection>
    <FormSection
      :title="$t('movement.sections.classification')"
      :description="$t(`movement.sections.classification-help.${typeKey}`)"
    >
      <SelectField
        name="costCenter"
        :label="$t('movement.form.cost-center')"
        :options="costCenterChoices"
        required
      />
      <SelectField
        name="classification"
        :label="$t(`movement.form.classification-of.${typeKey}`)"
        :options="classificationChoices"
        required
      />
    </FormSection>
    <FormSection
      v-if="!updating"
      :title="$t('movement.sections.payment')"
      :description="$t('movement.sections.payment-help')"
    >
      <StatusToggle name="paid" :label="$t('movement.form.paid')" heading="" />
      <template v-if="form.values.paid">
        <InputField name="paidOn" type="date" :label="$t('movement.form.paid-on')" mono required />
        <SegmentedField
          v-if="!income"
          name="via"
          :label="$t('movement.form.paid-by')"
          :options="viaChoices"
          required
        />
        <SelectField
          v-if="!onCard"
          name="wallet"
          :label="$t('movement.form.wallet')"
          :options="walletChoices"
          required
        />
        <SelectField
          v-else
          name="card"
          :label="$t('movement.form.card')"
          :options="cardChoices"
          :hint="$t('movement.form.card-hint')"
          required
        />
        <Alert
          v-if="onCard && openInvoice.missing.value"
          variant="destructive"
          class="md:col-span-2"
          data-slot="no-open-invoice"
        >
          <CircleAlert />
          <AlertTitle>
            {{
              $t('movement.form.no-open-invoice', {
                card: selectedCard?.name,
                period: selectedPeriod?.name,
              })
            }}
          </AlertTitle>
          <AlertDescription>{{ $t('movement.form.no-open-invoice-hint') }}</AlertDescription>
        </Alert>
        <MoneyField
          name="discount"
          :label="$t('movement.form.discount')"
          :hint="$t('movement.form.discount-hint')"
        />
      </template>
    </FormSection>
  </FormCard>
</template>
