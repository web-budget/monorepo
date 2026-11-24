<script setup lang="ts">
import { Lock, LockOpen, FileUp, Plus, ReceiptText } from 'lucide-vue-next'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import CloseInvoiceDialog from '@/components/invoices/CloseInvoiceDialog.vue'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge.vue'
import PurchaseInstallmentBadge from '@/components/invoices/PurchaseInstallmentBadge.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCloseInvoice } from '@/composables/useCloseInvoice'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useInvoicesStore } from '@/stores/invoices'
import { useMovementsStore } from '@/stores/movements'
import { dayAndMonth, purchaseDisplayName } from '@/utils/invoices'

const props = defineProps<{ id: string }>()

const { t } = useI18n()
const router = useRouter()
const store = useInvoicesStore()
const movements = useMovementsStore()
const { confirm } = useConfirmDialog()
const { showSuccess } = useNotification()
const { messages, run } = useServerErrors()

const invoice = computed(() => (store.invoice?.id === props.id ? store.invoice : null))
const payment = computed(() => invoice.value?.payment ?? null)
const open = computed(() => invoice.value?.status === 'OPEN')

const columns = computed(() => [
  {
    field: 'purchasedOn',
    header: t('credit-card-invoice.purchases.date'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  { field: 'name', header: t('credit-card-invoice.purchases.name'), mobile: 'title' as const },
  {
    field: 'costCenter',
    header: t('credit-card-invoice.purchases.cost-center'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'classification',
    header: t('credit-card-invoice.purchases.classification'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'value',
    header: t('credit-card-invoice.purchases.value'),
    align: 'end' as const,
    mobile: 'value' as const,
  },
])

async function load(id: string) {
  await store.findOne(id)
  await store.findPurchases(id)
}

const closing = useCloseInvoice(() => run(() => load(props.id)))

watch(
  () => props.id,
  (id) => run(() => load(id)),
  { immediate: true },
)

function openPurchase(purchase: { id: string }) {
  return router.push({ name: 'purchases.detail', params: { id: purchase.id } })
}

function newPurchaseTarget() {
  return {
    name: 'purchases.create',
    query: { card: invoice.value?.card.id, period: invoice.value?.financialPeriod.id },
  }
}

function importTarget() {
  return {
    name: 'invoices.import',
    query: { card: invoice.value?.card.id, period: invoice.value?.financialPeriod.id },
  }
}

async function deletePayment() {
  const target = payment.value
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
  <PageContainer>
    <PageHeader
      :title="invoice?.card.name ?? $t('credit-card-invoice.detail.title')"
      :description="invoice?.financialPeriod.name"
    >
      <template v-if="invoice" #title-extra>
        <span class="text-muted-foreground font-mono text-lg font-normal"
          >••{{ invoice.card.lastFourDigits }}</span
        >
      </template>
      <template v-if="invoice" #badge><InvoiceStatusBadge :status="invoice.status" /></template>
      <template v-if="invoice" #actions>
        <template v-if="open">
          <Button as-child variant="outline">
            <RouterLink :to="importTarget()">
              <FileUp />{{ $t('credit-card-invoice.actions.import') }}
            </RouterLink>
          </Button>
          <Button type="button" variant="outline" @click="closing.open(invoice)">
            <Lock />{{ $t('credit-card-invoice.actions.close') }}
          </Button>
          <Button as-child>
            <RouterLink :to="newPurchaseTarget()">
              <Plus />{{ $t('credit-card-invoice.actions.new-purchase') }}
            </RouterLink>
          </Button>
        </template>
        <template v-else>
          <Button v-if="payment" as-child variant="outline">
            <RouterLink :to="{ name: 'movements.detail', params: { id: payment.id } }">
              <ReceiptText />{{ $t('credit-card-invoice.actions.view-payment') }}
            </RouterLink>
          </Button>
          <Button
            v-if="payment && invoice.status === 'CLOSED'"
            type="button"
            variant="outline"
            @click="deletePayment()"
          >
            <LockOpen />{{ $t('credit-card-invoice.actions.delete-payment') }}
          </Button>
        </template>
      </template>
    </PageHeader>
    <ServerErrorAlert :messages="[...messages, ...closing.messages.value]" />
    <template v-if="invoice">
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3" data-slot="summary">
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{
            $t('credit-card-invoice.detail.total')
          }}</span>
          <CurrencyDisplay
            :value="invoice.value"
            class="text-xl font-semibold tracking-tight md:text-2xl"
          />
        </Card>
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{
            $t('credit-card-invoice.detail.purchases')
          }}</span>
          <span class="font-mono text-xl font-semibold tracking-tight md:text-2xl">
            {{ store.purchases.totalElements }}
          </span>
        </Card>
        <Card class="gap-1 p-4">
          <span class="text-muted-foreground text-xs">{{
            $t('credit-card-invoice.detail.due-date')
          }}</span>
          <span class="font-mono text-xl font-semibold tracking-tight md:text-2xl">
            {{ open || !invoice.dueDate ? '—' : dayAndMonth(invoice.dueDate) }}
          </span>
        </Card>
      </div>
      <Card
        v-if="store.purchases.totalElements === 0"
        class="grid justify-items-center gap-2 px-6 py-12 text-center"
        data-slot="no-purchases"
      >
        <ReceiptText class="text-muted-foreground size-6" />
        <p class="font-medium">{{ $t('credit-card-invoice.detail.no-purchases') }}</p>
        <Button v-if="open" as-child size="sm" class="mt-1">
          <RouterLink :to="newPurchaseTarget()">
            <Plus />{{ $t('credit-card-invoice.actions.new-purchase') }}
          </RouterLink>
        </Button>
      </Card>
      <ItemsTable
        v-else
        hide-footer
        :data="store.purchases.content"
        :total-elements="store.purchases.totalElements"
        :columns="columns"
        :show-status="false"
        :loading="store.loading"
        :current-page="0"
        :page-size="store.purchases.size"
        @row-selected="({ data }) => openPurchase(data)"
      >
        <template #cell-purchasedOn="{ item }">
          <DateTimeDisplay fix-time :value="item.purchasedOn" class="font-mono tabular-nums" />
        </template>
        <template #cell-name="{ item }">
          {{ purchaseDisplayName(item) }}
          <PurchaseInstallmentBadge
            :recurring-movement="item.recurringMovement"
            table
            class="ml-1"
          />
        </template>
        <template #cell-costCenter="{ item }">{{ item.costCenter.name }}</template>
        <template #cell-classification="{ item }">{{ item.classification.name }}</template>
        <template #cell-value="{ item }"><CurrencyDisplay :value="item.value" bare /></template>
      </ItemsTable>
      <div
        v-if="payment"
        class="bg-card flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-3 text-sm"
        data-slot="payment-bar"
      >
        <span class="flex items-center gap-2">
          <ReceiptText class="text-muted-foreground size-4" />
          {{ $t('credit-card-invoice.detail.payment-bar') }} <b>{{ payment.name }}</b>
        </span>
        <CurrencyDisplay :value="payment.value" bare />
      </div>
    </template>
  </PageContainer>
  <CloseInvoiceDialog
    v-bind="closing.dialog.value"
    @close="closing.cancel"
    @confirm="closing.confirm"
  />
</template>
