<script setup lang="ts">
import {
  ArrowRight,
  Banknote,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Lock,
  LockKeyhole,
  Plus,
} from 'lucide-vue-next'
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
import { useCloseClosingInvoice } from '@/composables/useCloseClosingInvoice'
import { useMovementActions } from '@/composables/useMovementActions'
import { useMovementFilterOptions } from '@/composables/useMovementFilterOptions'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { usePeriodClosingStore } from '@/stores/periodClosing'
import type { ClosingInvoiceView, ClosingPeriodView, MovementListView } from '@/types'
import { monthOf, oldestOpen } from '@/utils/periods'
import { queryValue } from '@/utils/queryValue'

const { t, n } = useI18n()
const route = useRoute()
const router = useRouter()
const { showSuccess } = useNotification()

const store = usePeriodClosingStore()
const { summary, result, accumulated, pendencies, invoices, loading } = storeToRefs(store)

const options = useMovementFilterOptions()
const activeWallets = useActiveWallets()
const activeCards = useActiveCards()
const optionErrors = useServerErrors()
const loadErrors = useServerErrors()
const moveErrors = useServerErrors()
const closeErrors = useServerErrors()
const supportErrors = useServerErrors()

const selectedId = ref('')
const periodsLoaded = ref(false)
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
      ? `${period.name} · ${t('financial-period.status.expired-short')}`
      : period.name,
  })),
)

function reload() {
  return loadErrors.run(() => store.load(selectedId.value))
}

const actions = useMovementActions(reload)
const closeInvoice = useCloseClosingInvoice(reload)

async function choose(id: string) {
  selectedId.value = id
  if (id === '') {
    store.reset()
    await router.replace({ query: { ...route.query, period: undefined } })
    return
  }
  await router.replace({ query: { ...route.query, period: id } })
  await reload()
}

onMounted(async () => {
  periodsLoaded.value = await optionErrors.run(options.load)
  const requested = queryValue(route.query.period)
  const known = openPeriods.value.find((period) => period.id === requested)
  await choose(known?.id ?? oldestOpen(options.periods.value)?.id ?? '')
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

const noNextPeriod = computed(() => summary.value != null && summary.value.nextOpenPeriod == null)
const pendenciesDone = computed(() => pendencies.value.length === 0)
const blockingInvoices = computed(() => summary.value?.openInvoices.length ?? 0)
const nextPeriodDone = computed(() => !noNextPeriod.value || pendenciesDone.value)
const ready = computed(() => summary.value?.canClose === true && !loading.value)

function toneOf(movement: MovementListView) {
  return movement.type === 'INCOME' ? 'income' : 'expense'
}

function openMove(movement: MovementListView) {
  moveErrors.messages.value = []
  moving.value = movement
}

function openClosing() {
  closeErrors.messages.value = []
  closing.value = true
}

function payLabel(movement: MovementListView) {
  return t(movement.type === 'INCOME' ? 'movement.actions.receive' : 'movement.actions.pay')
}

function openMovement(movement: MovementListView) {
  return router.push({ name: 'movements.detail', params: { id: movement.id } })
}

function openPay(movement: MovementListView) {
  actions.openPay({
    id: movement.id,
    name: movement.name,
    type: movement.type,
    value: movement.value,
    invoicePayment: movement.invoicePayment,
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

function invoiceNote(invoice: ClosingInvoiceView) {
  if (invoice.status === 'OPEN') {
    return invoice.purchaseCount > 0 ? 'blocking' : 'empty'
  }
  return invoice.status === 'CLOSED' ? 'payment' : 'paid'
}

function openCloseInvoice(invoice: ClosingInvoiceView) {
  return closeInvoice.open(invoice, selected.value!)
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
    const formatted = `${recordedResult < 0 ? '−' : ''}${n(Math.abs(recordedResult), 'currency')}`
    showSuccess('period-closing.toast.closed', 'period-closing.toast.closed-detail', true, {
      name: period.name,
      result: formatted,
    })
    await optionErrors.run(options.load)
    await choose(oldestOpen(options.periods.value)?.id ?? '')
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
        ...supportErrors.messages.value,
        ...actions.messages.value,
        ...closeInvoice.messages.value,
      ]"
    />
    <FilterSelect
      class="w-80 max-w-full"
      :label="$t('period-closing.period')"
      :options="periodChoices"
      :model-value="selectedId"
      @update:model-value="choose"
    />
    <Card
      v-if="periodsLoaded && openPeriods.length === 0"
      class="grid justify-items-center gap-2 px-6 py-14 text-center"
      data-slot="no-period"
    >
      <LockKeyhole class="text-muted-foreground size-6" />
      <p class="text-base font-semibold">{{ $t('period-closing.empty.title') }}</p>
      <p class="text-muted-foreground text-sm">{{ $t('period-closing.empty.description') }}</p>
      <Button type="button" size="sm" variant="outline" @click="createPeriod()">
        {{ $t('period-closing.empty.create') }}
      </Button>
    </Card>
    <div v-else-if="selected" class="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div class="grid gap-5">
        <section v-if="result && accumulated" data-slot="summary">
          <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Card class="gap-1 p-4">
              <span class="text-muted-foreground text-xs">{{
                $t('period-closing.summary.revenues')
              }}</span>
              <CurrencyDisplay
                :value="result.revenues"
                tone="income"
                class="text-xl font-semibold tracking-tight"
              />
              <span class="text-muted-foreground text-xs">{{
                $t('period-closing.summary.revenues-note')
              }}</span>
            </Card>
            <Card class="gap-1 p-4">
              <span class="text-muted-foreground text-xs">{{
                $t('period-closing.summary.expenses')
              }}</span>
              <CurrencyDisplay
                :value="result.expenses"
                tone="expense"
                class="text-xl font-semibold tracking-tight"
              />
              <span class="text-muted-foreground text-xs">{{
                $t('period-closing.summary.expenses-note')
              }}</span>
            </Card>
            <Card class="gap-1 p-4">
              <span class="text-muted-foreground text-xs">{{
                $t('period-closing.summary.result')
              }}</span>
              <CurrencyDisplay
                :value="result.result"
                :signed="result.result < 0"
                glued
                class="text-xl font-semibold tracking-tight"
              />
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
                :signed="accumulated.accumulated < 0"
                glued
                class="text-xl font-semibold tracking-tight"
              />
              <span class="text-muted-foreground text-xs">{{
                $t('period-closing.summary.accumulated-note')
              }}</span>
            </Card>
          </div>
        </section>
        <Card class="gap-0 py-0" data-slot="pendencies">
          <div class="flex flex-wrap items-start justify-between gap-3 border-b p-5">
            <div class="grid gap-0.5">
              <h2 class="text-base font-semibold">{{ $t('period-closing.pendencies.title') }}</h2>
              <p class="text-muted-foreground text-sm">
                {{ $t('period-closing.pendencies.hint') }}
              </p>
            </div>
            <Badge v-if="!pendenciesDone" variant="highlight" data-slot="remaining">
              {{ $t('period-closing.pendencies.remaining', pendencies.length) }}
            </Badge>
            <Badge v-else variant="approved" data-slot="resolved">
              {{ $t('period-closing.pendencies.resolved') }}
            </Badge>
          </div>
          <div
            v-if="pendenciesDone"
            class="grid justify-items-center gap-1 px-6 py-10 text-center"
            data-slot="no-pendencies"
          >
            <CircleCheck class="text-income size-6" />
            <p class="font-medium">{{ $t('period-closing.pendencies.none-title') }}</p>
            <p class="text-muted-foreground text-sm">{{ $t('period-closing.pendencies.none') }}</p>
          </div>
          <template v-else>
            <div v-if="noNextPeriod" class="p-5 pb-0">
              <Alert variant="destructive" data-slot="no-next-period">
                <CircleAlert />
                <AlertTitle>
                  {{ $t('period-closing.pendencies.no-next', { name: selected?.name }) }}
                </AlertTitle>
                <AlertDescription class="grid gap-2">
                  {{ $t('period-closing.pendencies.no-next-hint') }}
                  <span class="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" @click="createPeriod()">
                      <Plus />{{ $t('period-closing.pendencies.create-period') }}
                    </Button>
                  </span>
                </AlertDescription>
              </Alert>
            </div>
            <Table class="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>{{ $t('period-closing.pendencies.movement') }}</TableHead>
                  <TableHead>{{ $t('period-closing.pendencies.due-date') }}</TableHead>
                  <TableHead class="text-right">{{
                    $t('period-closing.pendencies.value')
                  }}</TableHead>
                  <TableHead class="text-right">{{
                    $t('period-closing.pendencies.actions')
                  }}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="movement in pendencies"
                  :key="movement.id"
                  class="cursor-pointer"
                  data-state="selected"
                  @click="openMovement(movement)"
                >
                  <TableCell>
                    <span class="inline-flex items-center gap-2">
                      <RouterLink
                        :to="{ name: 'movements.detail', params: { id: movement.id } }"
                        class="font-medium hover:underline"
                        @click.stop
                      >
                        {{ movement.name }}
                      </RouterLink>
                      <Badge v-if="movement.invoicePayment" variant="outline">
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
                      <Badge v-if="movement.overdue" variant="highlight">
                        {{ $t('period-closing.pendencies.overdue') }}
                      </Badge>
                    </span>
                  </TableCell>
                  <TableCell class="text-right">
                    <CurrencyDisplay :value="movement.value" :tone="toneOf(movement)" bare />
                  </TableCell>
                  <TableCell>
                    <span class="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        @click.stop="openPay(movement)"
                      >
                        <Banknote />{{ payLabel(movement) }}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        :disabled="noNextPeriod"
                        :title="
                          noNextPeriod ? $t('period-closing.pendencies.move-disabled') : undefined
                        "
                        @click.stop="openMove(movement)"
                      >
                        <ArrowRight />{{ $t('period-closing.pendencies.move') }}
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div class="grid md:hidden">
              <div
                v-for="movement in pendencies"
                :key="movement.id"
                class="grid cursor-pointer gap-1.5 border-b px-3.5 py-3 shadow-[inset_3px_0_0_var(--highlight)] last:border-b-0"
                data-slot="pendency-card"
                @click="openMovement(movement)"
              >
                <div class="flex items-start justify-between gap-3">
                  <span class="inline-flex flex-wrap items-center gap-2 font-medium">
                    {{ movement.name }}
                    <Badge v-if="movement.invoicePayment" variant="outline">
                      {{ $t('period-closing.pendencies.invoice') }}
                    </Badge>
                  </span>
                  <CurrencyDisplay :value="movement.value" :tone="toneOf(movement)" bare />
                </div>
                <div class="text-muted-foreground text-xs">
                  {{ $t('period-closing.pendencies.due-on') }}
                  <DateTimeDisplay fix-time :value="movement.dueDate" />
                  <template v-if="movement.overdue">
                    · {{ $t('period-closing.pendencies.overdue') }}
                  </template>
                </div>
                <div class="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" @click.stop="openPay(movement)">
                    <Banknote />{{ payLabel(movement) }}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    :disabled="noNextPeriod"
                    @click.stop="openMove(movement)"
                  >
                    <ArrowRight />{{ $t('period-closing.pendencies.move') }}
                  </Button>
                </div>
              </div>
            </div>
          </template>
        </Card>
        <Card class="gap-0 py-0" data-slot="invoices">
          <div class="grid gap-0.5 border-b p-5">
            <h2 class="text-base font-semibold">{{ $t('period-closing.invoices.title') }}</h2>
            <p class="text-muted-foreground text-sm">{{ $t('period-closing.invoices.hint') }}</p>
          </div>
          <p
            v-if="invoices.length === 0"
            class="text-muted-foreground px-5 py-6 text-center text-sm"
            data-slot="no-invoices"
          >
            {{ $t('period-closing.invoices.none') }}
          </p>
          <ul v-else class="divide-y">
            <li
              v-for="invoice in invoices"
              :key="invoice.id"
              class="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div class="grid min-w-0 gap-0.5">
                <span class="font-medium">
                  {{ invoice.card.name }}
                  <span class="text-muted-foreground font-mono text-xs"
                    >••{{ invoice.card.lastFourDigits }}</span
                  >
                </span>
                <span class="text-muted-foreground text-xs">
                  {{ $t('period-closing.invoices.purchases', invoice.purchaseCount) }} ·
                  {{ $t(`credit-card-invoice.status.${invoice.status}`) }}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <Badge
                  v-if="invoiceNote(invoice) === 'blocking'"
                  variant="highlight"
                  data-note="blocking"
                >
                  <Lock />{{ $t('period-closing.invoices.note.blocking') }}
                </Badge>
                <Badge
                  v-else-if="invoiceNote(invoice) === 'paid'"
                  variant="approved"
                  data-note="paid"
                >
                  {{ $t('period-closing.invoices.note.paid') }}
                </Badge>
                <Badge v-else variant="neutral" :data-note="invoiceNote(invoice)">
                  {{ $t(`period-closing.invoices.note.${invoiceNote(invoice)}`) }}
                </Badge>
                <CurrencyDisplay :value="invoice.value" bare />
                <Button
                  v-if="invoiceNote(invoice) === 'blocking'"
                  type="button"
                  size="sm"
                  variant="outline"
                  @click="openCloseInvoice(invoice)"
                >
                  <Lock />{{ $t('period-closing.invoices.close') }}
                </Button>
              </div>
            </li>
          </ul>
        </Card>
      </div>
      <Card class="content-start gap-4 p-4 lg:sticky lg:top-0" data-slot="checklist">
        <p class="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          {{ $t('period-closing.checklist.title') }}
        </p>
        <ul class="grid gap-3">
          <li class="flex gap-2.5" :data-done="pendenciesDone">
            <CircleCheck v-if="pendenciesDone" class="text-income mt-0.5 size-4 shrink-0" />
            <CircleDashed v-else class="text-highlight-foreground mt-0.5 size-4 shrink-0" />
            <span class="grid gap-0.5">
              <span :class="['text-sm', !pendenciesDone && 'font-medium']">{{
                $t('period-closing.checklist.pendencies')
              }}</span>
              <span class="text-muted-foreground text-xs">
                {{
                  pendenciesDone
                    ? $t('period-closing.checklist.pendencies-done')
                    : $t('period-closing.checklist.pendencies-open', pendencies.length)
                }}
              </span>
            </span>
          </li>
          <li class="flex gap-2.5" :data-done="blockingInvoices === 0">
            <CircleCheck v-if="blockingInvoices === 0" class="text-income mt-0.5 size-4 shrink-0" />
            <CircleDashed v-else class="text-highlight-foreground mt-0.5 size-4 shrink-0" />
            <span class="grid gap-0.5">
              <span :class="['text-sm', blockingInvoices > 0 && 'font-medium']">{{
                $t('period-closing.checklist.invoices')
              }}</span>
              <span class="text-muted-foreground text-xs">
                {{
                  blockingInvoices === 0
                    ? $t('period-closing.checklist.invoices-done')
                    : $t('period-closing.checklist.invoices-open', blockingInvoices)
                }}
              </span>
            </span>
          </li>
          <li class="flex gap-2.5" :data-done="nextPeriodDone">
            <CircleCheck v-if="nextPeriodDone" class="text-income mt-0.5 size-4 shrink-0" />
            <CircleDashed v-else class="text-highlight-foreground mt-0.5 size-4 shrink-0" />
            <span class="grid gap-0.5">
              <span :class="['text-sm', !nextPeriodDone && 'font-medium']">{{
                $t('period-closing.checklist.next-period')
              }}</span>
              <span class="text-muted-foreground text-xs">
                {{
                  summary?.nextOpenPeriod?.name ??
                  $t('period-closing.checklist.next-period-missing')
                }}
              </span>
            </span>
          </li>
        </ul>
        <div class="border-t pt-4">
          <Button type="button" class="w-full" :disabled="!ready" @click="openClosing()">
            <Lock />{{ $t('period-closing.checklist.close', { name: monthOf(selected?.name) }) }}
          </Button>
        </div>
      </Card>
    </div>
    <MoveMovementDialog
      :movement="moving"
      :targets="summary?.targetPeriods ?? []"
      :suggested="summary?.nextOpenPeriod ?? null"
      :loading="loading"
      :messages="moveErrors.messages.value"
      @close="moving = null"
      @confirm="move"
    />
    <ClosePeriodDialog
      :open="closing"
      :name="selected?.name ?? ''"
      :result="result"
      :loading="loading"
      :messages="closeErrors.messages.value"
      @close="closing = false"
      @confirm="closePeriod()"
    />
    <PayMovementDialog
      :movement="actions.payTarget.value"
      :wallets="activeWallets.wallets.value"
      :cards="activeCards.cards.value"
      :loading="loading"
      :balance-of="activeWallets.balanceOf"
      :messages="actions.payMessages.value"
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
      :messages="closeInvoice.closeMessages.value"
      @close="closeInvoice.close()"
      @confirm="closeInvoice.confirm()"
    />
  </PageContainer>
</template>
