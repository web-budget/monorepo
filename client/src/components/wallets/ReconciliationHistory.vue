<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { ArrowUpRight, CheckCheck, ListChecks } from 'lucide-vue-next'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import type { ItemsTablePageEvent } from '@/components/listing/itemsTable'
import ItemsTableFooter from '@/components/listing/ItemsTableFooter.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ReconciliationView } from '@/types'
import { RECONCILIATION_ROW_PREFIX } from '@/utils/reconciliationHistory'

defineProps<{
  walletId: string
  reconciliations: ReconciliationView[]
  total: number
  currentPage: number
  pageSize: number
  selectedId: string
  loading: boolean
  canReconcile: boolean
}>()

const emit = defineEmits<{ pageChanged: [event: ItemsTablePageEvent]; reconcile: [] }>()

const compact = useMediaQuery('(max-width: 767px)')

function adjustmentTarget(walletId: string, reconciliation: ReconciliationView) {
  return {
    name: 'statement.detail',
    params: { wallet: walletId, id: reconciliation.entryId },
  }
}

function rowId(reconciliation: ReconciliationView) {
  return `${RECONCILIATION_ROW_PREFIX}${reconciliation.id}`
}
</script>

<template>
  <Card class="gap-0 overflow-hidden py-0" data-slot="reconciliation-history">
    <div class="border-b px-5 py-3.5">
      <h2 class="text-base font-semibold">{{ $t('wallet.history.title') }}</h2>
    </div>
    <div
      v-if="loading && reconciliations.length === 0"
      :aria-label="$t('items-table.state.loading')"
    >
      <div v-for="row in 3" :key="row" class="flex items-center gap-4 border-b px-4 py-3.5">
        <Skeleton class="h-4 w-1/4" />
        <Skeleton class="h-4 w-1/6" />
        <Skeleton class="h-4 flex-1" />
      </div>
    </div>
    <div
      v-else-if="total === 0"
      class="grid justify-items-center gap-2 px-6 py-12 text-center"
      data-slot="reconciliation-history-empty"
    >
      <ListChecks class="text-muted-foreground size-6" />
      <p class="font-medium">{{ $t('wallet.history.empty') }}</p>
      <Button
        v-if="canReconcile"
        type="button"
        variant="outline"
        size="sm"
        @click="emit('reconcile')"
      >
        <CheckCheck />{{ $t('wallet.actions.reconcile') }}
      </Button>
    </div>
    <template v-else>
      <Table v-if="!compact">
        <TableHeader>
          <TableRow>
            <TableHead>{{ $t('statement.table-columns.created-on') }}</TableHead>
            <TableHead class="text-right">{{ $t('wallet.reconcile.informed-balance') }}</TableHead>
            <TableHead class="text-right">{{ $t('wallet.reconcile.wallet-balance') }}</TableHead>
            <TableHead class="text-right">{{ $t('wallet.reconcile.difference') }}</TableHead>
            <TableHead>{{ $t('wallet.reconcile.reason') }}</TableHead>
            <TableHead class="text-center">{{ $t('wallet.history.adjustment') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody :class="{ 'opacity-60': loading }">
          <TableRow
            v-for="reconciliation in reconciliations"
            :id="rowId(reconciliation)"
            :key="reconciliation.id"
            :class="cn(reconciliation.id === selectedId && 'bg-accent/70')"
            :data-selected="reconciliation.id === selectedId ? 'true' : undefined"
          >
            <TableCell class="font-mono tabular-nums">
              <DateTimeDisplay with-time :value="reconciliation.createdOn" />
            </TableCell>
            <TableCell class="text-right">
              <CurrencyDisplay
                :value="reconciliation.informedBalance"
                :signed="reconciliation.informedBalance < 0"
                bare
                glued
              />
            </TableCell>
            <TableCell class="text-right">
              <CurrencyDisplay
                :value="reconciliation.walletBalance"
                :signed="reconciliation.walletBalance < 0"
                bare
                glued
              />
            </TableCell>
            <TableCell class="text-right">
              <CurrencyDisplay
                :value="reconciliation.difference"
                :tone="reconciliation.difference > 0 ? 'income' : undefined"
                :signed="reconciliation.difference < 0"
                bare
                glued
              />
            </TableCell>
            <TableCell class="max-w-[22rem] truncate" :title="reconciliation.reason">
              {{ reconciliation.reason }}
            </TableCell>
            <TableCell class="text-center">
              <RouterLink
                :to="adjustmentTarget(walletId, reconciliation)"
                :aria-label="$t('wallet.history.open-adjustment')"
                :title="$t('wallet.history.open-adjustment')"
                class="text-muted-foreground hover:text-foreground inline-flex"
              >
                <ArrowUpRight class="size-4" />
              </RouterLink>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div v-else data-layout="compact">
        <div
          v-for="reconciliation in reconciliations"
          :id="rowId(reconciliation)"
          :key="reconciliation.id"
          :class="
            cn(
              'grid gap-1.5 border-b px-3.5 py-3',
              reconciliation.id === selectedId && 'bg-accent/70',
            )
          "
          :data-selected="reconciliation.id === selectedId ? 'true' : undefined"
        >
          <div class="flex items-start justify-between gap-3">
            <DateTimeDisplay
              with-time
              class="font-mono font-medium tabular-nums"
              :value="reconciliation.createdOn"
            />
            <CurrencyDisplay
              :value="reconciliation.difference"
              :tone="reconciliation.difference > 0 ? 'income' : undefined"
              :signed="reconciliation.difference < 0"
              bare
              glued
            />
          </div>
          <div class="text-sm">{{ reconciliation.reason }}</div>
          <div class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span>
              {{ $t('wallet.history.informed') }}:
              <CurrencyDisplay
                :value="reconciliation.informedBalance"
                :signed="reconciliation.informedBalance < 0"
                bare
                glued
              />
            </span>
            <span>
              {{ $t('wallet.history.wallet') }}:
              <CurrencyDisplay
                :value="reconciliation.walletBalance"
                :signed="reconciliation.walletBalance < 0"
                bare
                glued
              />
            </span>
            <RouterLink
              :to="adjustmentTarget(walletId, reconciliation)"
              class="text-primary inline-flex items-center gap-0.5"
            >
              {{ $t('wallet.history.view-adjustment') }}<ArrowUpRight class="size-3.5" />
            </RouterLink>
          </div>
        </div>
      </div>
      <div class="px-4 py-3">
        <ItemsTableFooter
          :total-elements="total"
          :page-size="pageSize"
          :current-page="currentPage"
          :noun="$t('wallet.history.noun', total)"
          @page-changed="emit('pageChanged', $event)"
        />
      </div>
    </template>
  </Card>
</template>
