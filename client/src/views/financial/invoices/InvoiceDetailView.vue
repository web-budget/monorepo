<script setup lang="ts">
import { Lock, LockOpen, Plus, ReceiptText } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { cardsApi } from '@/api/cards'
import { financialPeriodsApi } from '@/api/financialPeriods'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import CloseInvoiceDialog from '@/components/invoices/CloseInvoiceDialog.vue'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useInvoicePayment } from '@/composables/useInvoicePayment'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useInvoicesStore } from '@/stores/invoices'
import { useMovementsStore } from '@/stores/movements'
import type { CardView, FinancialPeriodView } from '@/types'
import { invoicePaymentDueDate } from '@/utils/invoices'
import i18n from '@/locales'

const props = defineProps<{ id: string }>()

const router = useRouter()
const store = useInvoicesStore()
const movements = useMovementsStore()
const { confirm } = useConfirmDialog()
const { showSuccess } = useNotification()
const { messages, run } = useServerErrors()
const invoicePayment = useInvoicePayment()

const card = ref<CardView | null>(null)
const period = ref<FinancialPeriodView | null>(null)
const closing = ref(false)

const invoice = computed(() => (store.invoice?.id === props.id ? store.invoice : null))
const payment = invoicePayment.payment

const title = computed(() =>
  invoice.value && card.value
    ? `${invoice.value.card.name} ••${card.value.lastFourDigits}`
    : (invoice.value?.card.name ?? i18n.global.t('credit-card-invoice.detail.title')),
)
const dueDate = computed(() => {
  if (payment.value) {
    return payment.value.dueDate
  }
  return card.value && period.value
    ? invoicePaymentDueDate(period.value.endingAt, card.value.invoicePaymentDay)
    : null
})
const columns = computed(() => [
  { field: 'purchasedOn', header: i18n.global.t('credit-card-invoice.purchases.date') },
  { field: 'name', header: i18n.global.t('credit-card-invoice.purchases.name') },
  {
    field: 'value',
    header: i18n.global.t('credit-card-invoice.purchases.value'),
    align: 'end' as const,
  },
])

async function load(id: string) {
  const loaded = await store.findOne(id)
  await Promise.all([
    store.findPurchases(id),
    invoicePayment.load(loaded),
    cardsApi.findById(loaded.card.id).then((found) => (card.value = found)),
    financialPeriodsApi.findById(loaded.financialPeriod.id).then((found) => (period.value = found)),
  ])
}

watch(
  () => props.id,
  (id) => run(() => load(id)),
  { immediate: true },
)

function openPurchase(purchase: { id: string }) {
  return router.push(`/financial/invoices/purchases/${purchase.id}/detail`)
}

async function closeInvoice() {
  if (await run(() => store.close(props.id))) {
    closing.value = false
    showSuccess(
      'credit-card-invoice.toast.closed',
      'credit-card-invoice.toast.closed-detail',
      true,
      {
        value: i18n.global.n(invoice.value!.value, 'currency'),
      },
    )
    await run(() => load(props.id))
  }
}

async function deletePayment() {
  const target = payment.value
  const { t } = i18n.global
  const confirmed = await confirm({
    destructive: true,
    title: t('credit-card-invoice.delete-payment.title'),
    description: t('credit-card-invoice.delete-payment.description', {
      card: invoice.value?.card.name,
    }),
    confirmLabel: t('credit-card-invoice.delete-payment.confirm'),
  })
  if (confirmed && target && (await run(() => movements.remove(target.id)))) {
    showSuccess('credit-card-invoice.toast.reopened', 'credit-card-invoice.toast.reopened-detail')
    await run(() => load(props.id))
  }
}
</script>

<template>
  <DetailCard :title="title" :description="period?.name" :messages="messages" readonly>
    <template v-if="invoice" #badge><InvoiceStatusBadge :status="invoice.status" /></template>
    <template #extra-actions>
      <Button v-if="invoice?.status === 'OPEN'" as-child>
        <RouterLink
          :to="{
            path: '/financial/invoices/purchases/create',
            query: { card: invoice.card.id, period: invoice.financialPeriod.id },
          }"
        >
          <Plus />{{ $t('credit-card-invoice.actions.new-purchase') }}
        </RouterLink>
      </Button>
      <Button
        v-if="invoice?.status === 'OPEN'"
        type="button"
        variant="outline"
        @click="closing = true"
      >
        <Lock />{{ $t('credit-card-invoice.actions.close') }}
      </Button>
      <Button v-if="payment" as-child variant="outline">
        <RouterLink :to="`/financial/movements/${payment.id}/detail`">
          <ReceiptText />{{ $t('credit-card-invoice.actions.view-payment') }}
        </RouterLink>
      </Button>
      <Button
        v-if="payment && invoice?.status === 'CLOSED'"
        type="button"
        variant="outline"
        @click="deletePayment()"
      >
        <LockOpen />{{ $t('credit-card-invoice.actions.delete-payment') }}
      </Button>
    </template>
    <template v-if="invoice">
      <div class="grid grid-cols-2 gap-3 border-b p-5 md:grid-cols-3" data-slot="summary">
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{
            $t('credit-card-invoice.detail.total')
          }}</span>
          <CurrencyDisplay :value="invoice.value" class="text-xl font-semibold" />
        </Card>
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{
            $t('credit-card-invoice.detail.purchases')
          }}</span>
          <span class="font-mono text-xl font-semibold">{{ store.purchases.totalElements }}</span>
        </Card>
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{
            $t('credit-card-invoice.detail.due-date')
          }}</span>
          <span v-if="payment" class="font-mono text-xl font-semibold">
            <DateTimeDisplay fix-time :value="payment.dueDate" />
          </span>
          <span v-else class="text-xl font-semibold">—</span>
        </Card>
      </div>
      <DetailSection :title="$t('credit-card-invoice.sections.purchases')" columns="grid-cols-1">
        <p
          v-if="store.purchases.totalElements === 0"
          class="text-muted-foreground text-sm"
          data-slot="no-purchases"
        >
          {{ $t('credit-card-invoice.detail.no-purchases') }}
        </p>
        <ItemsTable
          v-else
          :data="store.purchases.content"
          :total-elements="store.purchases.totalElements"
          :columns="columns"
          :show-status="false"
          :loading="store.loading"
          :current-page="0"
          :page-size="50"
          @row-selected="({ data }) => openPurchase(data)"
        >
          <template #cell-purchasedOn="{ item }">
            <DateTimeDisplay fix-time :value="item.purchasedOn" class="font-mono" />
          </template>
          <template #cell-value="{ item }"><CurrencyDisplay :value="item.value" /></template>
        </ItemsTable>
      </DetailSection>
    </template>
  </DetailCard>
  <CloseInvoiceDialog
    :open="closing"
    :title="
      $t('credit-card-invoice.close.title', { period: period?.name, card: invoice?.card.name })
    "
    :purchases="store.purchases.totalElements"
    :value="invoice?.value ?? 0"
    :due-date="dueDate"
    :wallet-name="card?.wallet?.name ?? null"
    :loading="store.loading"
    @close="closing = false"
    @confirm="closeInvoice"
  />
</template>
