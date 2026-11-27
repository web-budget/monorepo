<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import MiniBars from '@/components/dashboards/MiniBars.vue'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { InvoiceStatus, PeriodCard } from '@/types'

const props = defineProps<{ cards: PeriodCard[] }>()

const emit = defineEmits<{ open: [card: PeriodCard] }>()

const compact = useMediaQuery('(max-width: 767px)')

const BADGES = { PAID: 'approved', CLOSED: 'pending', OPEN: 'neutral' } as const

const total = computed(() => props.cards.reduce((sum, card) => sum + card.purchases, 0))

const periodCount = computed(() =>
  props.cards.reduce((maximum, card) => Math.max(maximum, card.history.length), 0),
)

function bars(card: PeriodCard) {
  return card.history.map((entry) => ({
    label: entry.financialPeriod.name,
    value: entry.purchases,
  }))
}

function badgeOf(status: InvoiceStatus) {
  return BADGES[status]
}
</script>

<template>
  <Card class="gap-0 overflow-hidden py-0" data-slot="cards">
    <div
      class="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5"
    >
      <h2 class="text-base font-semibold">{{ $t('period-dashboard.cards.title') }}</h2>
      <span class="flex items-baseline gap-2 text-sm">
        <span class="text-muted-foreground">{{ $t('period-dashboard.cards.purchases') }}</span>
        <span data-slot="cards-total"><CurrencyDisplay :value="total" tone="expense" /></span>
      </span>
    </div>
    <Table v-if="!compact" data-slot="cards-table">
      <TableHeader>
        <TableRow>
          <TableHead>{{ $t('period-dashboard.cards.card') }}</TableHead>
          <TableHead>{{ $t('period-dashboard.cards.invoice') }}</TableHead>
          <TableHead class="text-right">{{ $t('period-dashboard.cards.value') }}</TableHead>
          <TableHead>{{ $t('period-dashboard.cards.history', periodCount) }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="card in cards"
          :key="card.id"
          class="cursor-pointer"
          tabindex="0"
          data-slot="card-row"
          @click="emit('open', card)"
          @keydown.enter="emit('open', card)"
        >
          <TableCell>
            {{ card.name }}
            <span class="text-muted-foreground font-mono">••{{ card.lastFourDigits }}</span>
          </TableCell>
          <TableCell>
            <Badge v-if="card.invoiceStatus !== null" :variant="badgeOf(card.invoiceStatus)">{{
              $t(`period-dashboard.cards.status.${card.invoiceStatus}`)
            }}</Badge>
          </TableCell>
          <TableCell class="text-right">
            <CurrencyDisplay :value="card.purchases" tone="expense" bare />
          </TableCell>
          <TableCell>
            <MiniBars :bars="bars(card)" :description="`${card.name} ••${card.lastFourDigits}`" />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div v-else data-slot="cards-list">
      <div
        v-for="card in cards"
        :key="card.id"
        class="border-border grid cursor-pointer gap-1.5 border-b px-3.5 py-3 last:border-b-0"
        tabindex="0"
        data-slot="card-item"
        @click="emit('open', card)"
        @keydown.enter="emit('open', card)"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="font-medium">
            {{ card.name }}
            <span class="text-muted-foreground font-mono">••{{ card.lastFourDigits }}</span>
          </span>
          <CurrencyDisplay :value="card.purchases" tone="expense" bare />
        </div>
        <div class="flex items-end justify-between gap-3">
          <Badge v-if="card.invoiceStatus !== null" :variant="badgeOf(card.invoiceStatus)">{{
            $t(`period-dashboard.cards.status.${card.invoiceStatus}`)
          }}</Badge>
          <span v-else />
          <MiniBars :bars="bars(card)" :description="`${card.name} ••${card.lastFourDigits}`" />
        </div>
      </div>
    </div>
  </Card>
</template>
