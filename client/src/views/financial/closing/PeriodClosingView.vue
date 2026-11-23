<script setup lang="ts">
import { Check, Circle, Lock, TriangleAlert } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge.vue'
import CloseInvoiceDialog from '@/components/invoices/CloseInvoiceDialog.vue'
import PeriodStatusBadge from '@/components/listing/PeriodStatusBadge.vue'
import PayMovementDialog from '@/components/movements/PayMovementDialog.vue'
import ClosePeriodDialog from '@/components/periods/ClosePeriodDialog.vue'
import MoveMovementDialog from '@/components/periods/MoveMovementDialog.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useActiveCards } from '@/composables/useActiveCards'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useCloseInvoice } from '@/composables/useCloseInvoice'
import { useMovementActions } from '@/composables/useMovementActions'
import { useMovementFilterOptions } from '@/composables/useMovementFilterOptions'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { usePeriodClosingStore } from '@/stores/periodClosing'
import type { ClosingPeriodView, MovementListView } from '@/types'
import { defaultClosingPeriod } from '@/utils/periods'
import { queryValue } from '@/utils/queryValue'

const { t, n } = useI18n()
const route = useRoute()
const router = useRouter()
const { showSuccess } = useNotification()

const store = usePeriodClosingStore()
const { summary, result, accumulated, pendencies, invoicePaymentIds, invoices, loading } =
  storeToRefs(store)

const options = useMovementFilterOptions()
const activeWallets = useActiveWallets()
const activeCards = useActiveCards()
const optionErrors = useServerErrors()
const loadErrors = useServerErrors()
const moveErrors = useServerErrors()
const closeErrors = useServerErrors()
const supportErrors = useServerErrors()

const selectedId = ref('')
const closing = ref(false)
const moving = ref<MovementListView | null>(null)

const openPeriods = computed(() =>
  options.periods.value.filter((period) => period.status === 'OPEN'),
)
const selected = computed(() => openPeriods.value.find((period) => period.id === selectedId.value))
const periodChoices = computed(() =>
  openPeriods.value.map((period) => ({
    value: period.id,
    label: period.expired
      ? `${period.name} · ${t('financial-period.status.expired')}`
      : period.name,
  })),
)

function reload() {
  return loadErrors.run(() => store.load(selectedId.value))
}

const actions = useMovementActions(reload)
const closeInvoice = useCloseInvoice(reload)

async function choose(id: string) {
  selectedId.value = id
  if (id === '') {
    return
  }
  await router.replace({ query: { ...route.query, period: id } })
  await reload()
}

onMounted(async () => {
  await optionErrors.run(options.load)
  const requested = queryValue(route.query.period)
  const known = openPeriods.value.find((period) => period.id === requested)
  await choose(known?.id ?? defaultClosingPeriod(options.periods.value)?.id ?? '')
  await supportErrors.run(async () => {
    await Promise.all([activeWallets.load(), activeCards.load()])
  })
})

watch(
  () => queryValue(route.query.period),
  (requested) => {
    if (
      requested !== selectedId.value &&
      openPeriods.value.some((period) => period.id === requested)
    ) {
      return choose(requested)
    }
  },
)

const hasPendencies = computed(() => (summary.value?.openMovements.count ?? 0) > 0)
const checklist = computed(() => [
  { key: 'pendencies', done: !hasPendencies.value },
  { key: 'invoices', done: (summary.value?.openInvoices.length ?? 0) === 0 },
  { key: 'next-period', done: summary.value?.nextOpenPeriod != null },
])
const noNextPeriod = computed(() => summary.value !== null && summary.value.nextOpenPeriod === null)

function isInvoicePayment(movement: MovementListView) {
  return invoicePaymentIds.value.includes(movement.id)
}

function signedValue(movement: MovementListView) {
  return movement.type === 'INCOME' ? movement.value : -movement.value
}

function openPay(movement: MovementListView) {
  actions.openPay({
    id: movement.id,
    name: movement.name,
    type: movement.type,
    value: movement.value,
    invoicePayment: isInvoicePayment(movement),
  })
}

async function move(movement: { id: string; name: string }, target: ClosingPeriodView) {
  if (await moveErrors.run(() => store.move(movement.id, target.id))) {
    moving.value = null
    showSuccess('period-closing.toast.moved', 'period-closing.toast.moved-detail', true, {
      name: movement.name,
      period: target.name,
    })
    await reload()
  }
}

function invoiceNote(invoice: { id: string }, status: string) {
  if (summary.value?.openInvoices.some((blocking) => blocking.id === invoice.id)) {
    return 'blocking'
  }
  if (summary.value?.emptyInvoices.some((empty) => empty.id === invoice.id)) {
    return 'empty'
  }
  return status === 'CLOSED' ? 'payment' : status === 'PAID' ? 'paid' : null
}

function openCloseInvoice(invoice: { id: string }) {
  const blocking = summary.value!.openInvoices.find((candidate) => candidate.id === invoice.id)!
  return closeInvoice.open(blocking, selected.value!)
}

async function closePeriod() {
  const period = selected.value!
  let recordedResult = 0
  if (
    await closeErrors.run(async () => {
      recordedResult = (await store.close(period.id)).result
    })
  ) {
    closing.value = false
    const formatted = `${recordedResult < 0 ? '−' : '+'}${n(Math.abs(recordedResult), 'currency')}`
    showSuccess('period-closing.toast.closed', 'period-closing.toast.closed-detail', true, {
      name: period.name,
      result: formatted,
    })
    await router.push({ name: 'financial-periods' })
  }
}

function createPeriod() {
  return router.push({ name: 'financial-periods.create' })
}
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader
      :title="
        selected
          ? $t('period-closing.title-of', { name: selected.name })
          : $t('period-closing.title')
      "
      :description="$t('period-closing.description')"
    >
      <template v-if="selected" #badge>
        <PeriodStatusBadge :status="selected.status" :expired="selected.expired" />
      </template>
    </PageHeader>
    <ServerErrorAlert
      :messages="[
        ...optionErrors.messages.value,
        ...loadErrors.messages.value,
        ...moveErrors.messages.value,
        ...closeErrors.messages.value,
        ...supportErrors.messages.value,
        ...actions.messages.value,
        ...closeInvoice.messages.value,
      ]"
    />
    <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div class="grid gap-5">
        <div class="max-w-sm">
          <FilterSelect
            :label="$t('period-closing.period')"
            :none-label="$t('period-closing.none')"
            :options="periodChoices"
            :model-value="selectedId"
            @update:model-value="choose"
          />
        </div>
        <div
          v-if="result && accumulated"
          class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
          data-slot="summary"
        >
          <Card class="gap-1 p-4">
            <span class="text-muted-foreground text-xs">{{
              $t('period-closing.summary.revenues')
            }}</span>
            <CurrencyDisplay :value="result.revenues" signed class="text-xl font-semibold" />
            <span class="text-muted-foreground text-xs">{{
              $t('period-closing.summary.revenues-note')
            }}</span>
          </Card>
          <Card class="gap-1 p-4">
            <span class="text-muted-foreground text-xs">{{
              $t('period-closing.summary.expenses')
            }}</span>
            <CurrencyDisplay :value="-result.expenses" signed class="text-xl font-semibold" />
            <span class="text-muted-foreground text-xs">{{
              $t('period-closing.summary.expenses-note')
            }}</span>
          </Card>
          <Card class="gap-1 p-4">
            <span class="text-muted-foreground text-xs">{{
              $t('period-closing.summary.result')
            }}</span>
            <CurrencyDisplay :value="result.result" signed class="text-xl font-semibold" />
            <span class="text-muted-foreground text-xs">{{
              $t('period-closing.summary.result-note')
            }}</span>
          </Card>
          <Card class="gap-1 p-4">
            <span class="text-muted-foreground text-xs">{{
              $t('period-closing.summary.accumulated')
            }}</span>
            <CurrencyDisplay
              :value="accumulated.accumulated"
              signed
              class="text-xl font-semibold"
            />
            <span class="text-muted-foreground text-xs">{{
              $t('period-closing.summary.accumulated-note')
            }}</span>
          </Card>
        </div>
        <Card class="gap-0 py-0" data-slot="pendencies">
          <div class="border-b p-5">
            <h2 class="text-base font-semibold">{{ $t('period-closing.pendencies.title') }}</h2>
            <p class="text-muted-foreground text-sm">{{ $t('period-closing.pendencies.hint') }}</p>
          </div>
          <Alert
            v-if="noNextPeriod"
            variant="destructive"
            class="m-5 mb-0"
            data-slot="no-next-period"
          >
            <TriangleAlert />
            <AlertTitle>
              {{ $t('period-closing.pendencies.no-next', { name: selected?.name }) }}
            </AlertTitle>
            <AlertDescription class="flex flex-wrap items-center gap-3">
              {{ $t('period-closing.pendencies.no-next-hint') }}
              <Button type="button" size="sm" variant="outline" @click="createPeriod()">
                {{ $t('period-closing.pendencies.create-period') }}
              </Button>
            </AlertDescription>
          </Alert>
          <p
            v-if="pendencies.length === 0"
            class="text-muted-foreground p-5 text-sm"
            data-slot="no-pendencies"
          >
            {{ $t('period-closing.pendencies.none') }}
          </p>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>{{ $t('period-closing.pendencies.movement') }}</TableHead>
                <TableHead>{{ $t('period-closing.pendencies.due-date') }}</TableHead>
                <TableHead class="text-right">{{
                  $t('period-closing.pendencies.value')
                }}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="movement in pendencies"
                :key="movement.id"
                :data-state="movement.overdue ? 'selected' : undefined"
              >
                <TableCell>
                  <span class="inline-flex items-center gap-2">
                    {{ movement.name }}
                    <Badge v-if="isInvoicePayment(movement)" variant="outline">
                      {{ $t('period-closing.pendencies.invoice') }}
                    </Badge>
                  </span>
                </TableCell>
                <TableCell>
                  <span class="inline-flex items-center gap-2">
                    <DateTimeDisplay
                      fix-time
                      :value="movement.dueDate"
                      class="font-mono tabular-nums"
                    />
                    <Badge v-if="movement.overdue" variant="pending">
                      {{ $t('period-closing.pendencies.overdue') }}
                    </Badge>
                  </span>
                </TableCell>
                <TableCell class="text-right">
                  <CurrencyDisplay :value="signedValue(movement)" signed />
                </TableCell>
                <TableCell class="text-right">
                  <span class="inline-flex gap-2">
                    <Button type="button" size="sm" variant="outline" @click="openPay(movement)">
                      {{
                        $t(
                          movement.type === 'INCOME'
                            ? 'movement.actions.receive'
                            : 'movement.actions.pay',
                        )
                      }}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      :disabled="noNextPeriod"
                      :title="
                        noNextPeriod ? $t('period-closing.pendencies.move-disabled') : undefined
                      "
                      @click="moving = movement"
                    >
                      {{ $t('period-closing.pendencies.move') }}
                    </Button>
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
        <Card class="gap-0 py-0" data-slot="invoices">
          <div class="border-b p-5">
            <h2 class="text-base font-semibold">{{ $t('period-closing.invoices.title') }}</h2>
            <p class="text-muted-foreground text-sm">{{ $t('period-closing.invoices.hint') }}</p>
          </div>
          <p
            v-if="invoices.length === 0"
            class="text-muted-foreground p-5 text-sm"
            data-slot="no-invoices"
          >
            {{ $t('period-closing.invoices.none') }}
          </p>
          <ul v-else class="divide-y">
            <li
              v-for="invoice in invoices"
              :key="invoice.id"
              class="flex flex-wrap items-center gap-x-4 gap-y-2 p-4"
            >
              <span class="min-w-32 font-medium">{{ invoice.card.name }}</span>
              <InvoiceStatusBadge :status="invoice.status" />
              <CurrencyDisplay :value="invoice.value" />
              <span
                v-if="invoiceNote(invoice, invoice.status)"
                class="text-muted-foreground inline-flex items-center gap-1 text-xs"
                :data-note="invoiceNote(invoice, invoice.status)"
              >
                <Lock v-if="invoiceNote(invoice, invoice.status) === 'blocking'" class="size-3" />
                {{ $t(`period-closing.invoices.note.${invoiceNote(invoice, invoice.status)}`) }}
              </span>
              <Button
                v-if="invoiceNote(invoice, invoice.status) === 'blocking'"
                type="button"
                size="sm"
                class="ml-auto"
                @click="openCloseInvoice(invoice)"
              >
                {{ $t('period-closing.invoices.close') }}
              </Button>
            </li>
          </ul>
        </Card>
      </div>
      <Card class="gap-3 p-5" data-slot="checklist">
        <h2 class="text-base font-semibold">{{ $t('period-closing.checklist.title') }}</h2>
        <ul class="grid gap-2 text-sm">
          <li
            v-for="item in checklist"
            :key="item.key"
            class="flex items-center gap-2"
            :data-done="item.done"
          >
            <Check v-if="item.done" class="text-income size-4" />
            <Circle v-else class="text-muted-foreground size-4" />
            {{ $t(`period-closing.checklist.${item.key}`) }}
          </li>
        </ul>
        <Button type="button" :disabled="!summary?.canClose || loading" @click="closing = true">
          <Lock />{{ $t('period-closing.checklist.close', { name: selected?.name }) }}
        </Button>
      </Card>
    </div>
    <MoveMovementDialog
      :movement="moving"
      :targets="summary?.targetPeriods ?? []"
      :suggested="summary?.nextOpenPeriod ?? null"
      :loading="loading"
      @close="moving = null"
      @confirm="move"
    />
    <ClosePeriodDialog
      :open="closing"
      :name="selected?.name ?? ''"
      :result="result"
      :loading="loading"
      @close="closing = false"
      @confirm="closePeriod()"
    />
    <PayMovementDialog
      :movement="actions.payTarget.value"
      :wallets="activeWallets.wallets.value"
      :cards="activeCards.cards.value"
      :loading="loading"
      :balance-of="activeWallets.balanceOf"
      @close="actions.closePay()"
      @pay="actions.pay"
    />
    <CloseInvoiceDialog
      :open="closeInvoice.target.value !== null"
      :title="
        $t('credit-card-invoice.close.title', {
          period: closeInvoice.target.value?.period.name,
          card: closeInvoice.target.value?.invoice.card.name,
        })
      "
      :purchases="closeInvoice.purchases.value"
      :value="closeInvoice.target.value?.invoice.value ?? 0"
      :due-date="closeInvoice.dueDate.value"
      :wallet-name="closeInvoice.card.value?.wallet?.name ?? null"
      :loading="loading"
      @close="closeInvoice.close()"
      @confirm="closeInvoice.confirm()"
    />
  </PageContainer>
</template>
