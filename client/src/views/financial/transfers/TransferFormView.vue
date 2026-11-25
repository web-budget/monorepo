<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import TransferStatement from '@/components/transfers/TransferStatement.vue'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useDiscardGuard } from '@/composables/useDiscardGuard'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { toTransferForm, transferFormSchema } from '@/schemas/transferSchema'
import { useTransfersStore } from '@/stores/transfers'
import { queryValue } from '@/utils/queryValue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useTransfersStore()
const activeWallets = useActiveWallets()
const { showSuccess } = useNotification()
const { messages, fields, clearFields, run } = useServerErrors()

const form = useForm({ validationSchema: transferFormSchema })

const submitting = ref(false)
const balances = ref<Record<string, number>>({})

const dirty = computed(() => form.meta.value.dirty)
const { saved } = useDiscardGuard(
  () => dirty.value,
  () => t('transfer.form.new'),
)

const walletChoices = computed(() =>
  activeWallets.wallets.value.map((wallet) => ({ value: wallet.id, label: wallet.name })),
)

function side(walletId: string | undefined) {
  const wallet = activeWallets.wallets.value.find((candidate) => candidate.id === walletId)
  return wallet ? { name: wallet.name, balance: balances.value[wallet.id] ?? null } : null
}

const from = computed(() => side(form.values.fromWallet))
const to = computed(() => side(form.values.toWallet))

async function loadBalance(walletId: string | undefined) {
  if (walletId && balances.value[walletId] === undefined) {
    await run(async () => {
      balances.value = { ...balances.value, [walletId]: await activeWallets.balanceOf(walletId) }
    })
  }
}

watch(() => form.values.fromWallet, loadBalance)
watch(() => form.values.toWallet, loadBalance)
watch(() => form.values, clearFields, { deep: true })

function cancel() {
  return router.push({ name: 'transfers' })
}

const onSubmit = form.handleSubmit(async (values) => {
  submitting.value = true
  try {
    let createdId = ''
    if (await run(async () => (createdId = await store.create(toTransferForm(values))))) {
      saved.value = true
      showSuccess('transfer.toast.created', 'transfer.toast.created-detail')
      await router.push({ name: 'transfers.detail', params: { id: createdId } })
    }
  } finally {
    submitting.value = false
  }
})

onMounted(async () => {
  await run(() => activeWallets.load())
  const origin = queryValue(route.query.from)
  if (activeWallets.wallets.value.some((wallet) => wallet.id === origin)) {
    form.setFieldValue('fromWallet', origin)
  }
})
</script>

<template>
  <FormCard
    :title="$t('transfer.form.title')"
    :loading="false"
    :submitting="submitting"
    :dirty="dirty"
    :messages="messages"
    :fields="fields"
    :submit-label="$t('transfer.form.submit')"
    @submit="onSubmit"
    @back="cancel"
  >
    <FormSection :title="$t('transfer.sections.wallets')">
      <SelectField
        name="fromWallet"
        :label="$t('transfer.form.from')"
        :options="walletChoices"
        required
      />
      <SelectField
        name="toWallet"
        :label="$t('transfer.form.to')"
        :options="walletChoices"
        required
      />
    </FormSection>
    <FormSection :title="$t('transfer.sections.value')">
      <div class="grid content-start gap-4">
        <MoneyField name="value" :label="$t('transfer.form.value')" required />
        <InputField
          name="description"
          :label="$t('transfer.form.note')"
          :placeholder="$t('transfer.form.note-placeholder')"
          multiline
        />
      </div>
      <TransferStatement
        :title="$t('transfer.statement.title')"
        :from="from"
        :to="to"
        :value="form.values.value ?? 0"
      />
    </FormSection>
  </FormCard>
</template>
