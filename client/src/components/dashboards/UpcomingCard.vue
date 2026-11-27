<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-vue-next'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
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
import type { PeriodUpcoming, PeriodUpcomingItem } from '@/types'
import { dayAndMonth } from '@/utils/invoices'
import { daysOverdue } from '@/utils/periodDashboard'

defineProps<{ upcoming: PeriodUpcoming; today: Date }>()

const emit = defineEmits<{ open: [item: PeriodUpcomingItem] }>()

const compact = useMediaQuery('(max-width: 767px)')

function tone(item: PeriodUpcomingItem) {
  return item.type === 'INCOME' ? 'income' : 'expense'
}
</script>

<template>
  <Card class="gap-0 overflow-hidden py-0" data-slot="upcoming">
    <div
      class="border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5"
    >
      <h2 class="text-base font-semibold">{{ $t('period-dashboard.upcoming.title') }}</h2>
      <dl class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div class="flex items-baseline gap-2">
          <dt class="text-muted-foreground">{{ $t('period-dashboard.upcoming.to-receive') }}</dt>
          <dd class="m-0" data-slot="to-receive">
            <CurrencyDisplay :value="upcoming.toReceive" tone="income" />
          </dd>
        </div>
        <div class="flex items-baseline gap-2">
          <dt class="text-muted-foreground">{{ $t('period-dashboard.upcoming.to-pay') }}</dt>
          <dd class="m-0" data-slot="to-pay">
            <CurrencyDisplay :value="upcoming.toPay" tone="expense" />
          </dd>
        </div>
      </dl>
    </div>
    <p
      v-if="upcoming.items.length === 0"
      class="text-muted-foreground px-5 py-8 text-center text-sm"
      data-slot="upcoming-empty"
    >
      {{ $t('period-dashboard.upcoming.empty') }}
    </p>
    <Table v-else-if="!compact" data-slot="upcoming-table">
      <TableHeader>
        <TableRow>
          <TableHead>{{ $t('period-dashboard.upcoming.due-date') }}</TableHead>
          <TableHead>{{ $t('period-dashboard.upcoming.movement') }}</TableHead>
          <TableHead>{{ $t('period-dashboard.upcoming.period') }}</TableHead>
          <TableHead class="text-right">{{ $t('period-dashboard.upcoming.value') }}</TableHead>
          <TableHead>{{ $t('period-dashboard.upcoming.situation') }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="item in upcoming.items"
          :key="item.id"
          :class="['cursor-pointer', item.overdue && 'shadow-[inset_3px_0_0_var(--highlight)]']"
          tabindex="0"
          data-slot="upcoming-row"
          :data-overdue="item.overdue"
          @click="emit('open', item)"
          @keydown.enter="emit('open', item)"
        >
          <TableCell class="font-mono tabular-nums">{{ dayAndMonth(item.dueDate) }}</TableCell>
          <TableCell>
            {{ item.name }}
            <Badge v-if="item.invoicePayment" variant="outline">{{
              $t('period-dashboard.upcoming.invoice')
            }}</Badge>
          </TableCell>
          <TableCell class="text-muted-foreground">{{ item.financialPeriod.name }}</TableCell>
          <TableCell class="text-right">
            <span class="inline-flex items-center justify-end gap-1">
              <component
                :is="item.type === 'INCOME' ? ArrowDownLeft : ArrowUpRight"
                :class="['size-3.5', item.type === 'INCOME' ? 'text-income' : 'text-expense']"
              />
              <CurrencyDisplay :value="item.value" :tone="tone(item)" bare />
            </span>
          </TableCell>
          <TableCell>
            <Badge v-if="item.overdue" variant="highlight" data-slot="overdue">
              <Clock />{{
                $t('period-dashboard.upcoming.overdue', daysOverdue(item.dueDate, today))
              }}
            </Badge>
            <Badge v-else variant="neutral">{{ $t('period-dashboard.upcoming.open') }}</Badge>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div v-else data-slot="upcoming-cards">
      <div
        v-for="item in upcoming.items"
        :key="item.id"
        :class="[
          'border-border grid cursor-pointer gap-1.5 border-b px-3.5 py-3 last:border-b-0',
          item.overdue && 'shadow-[inset_3px_0_0_var(--highlight)]',
        ]"
        tabindex="0"
        data-slot="upcoming-card"
        @click="emit('open', item)"
        @keydown.enter="emit('open', item)"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="min-w-0 font-medium">
            {{ item.name }}
            <Badge v-if="item.invoicePayment" variant="outline">{{
              $t('period-dashboard.upcoming.invoice')
            }}</Badge>
          </span>
          <span class="inline-flex items-center gap-1">
            <component
              :is="item.type === 'INCOME' ? ArrowDownLeft : ArrowUpRight"
              :class="['size-3.5', item.type === 'INCOME' ? 'text-income' : 'text-expense']"
            />
            <CurrencyDisplay :value="item.value" :tone="tone(item)" bare />
          </span>
        </div>
        <div class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span
            >{{ $t('period-dashboard.upcoming.due-on') }}
            <span class="font-mono">{{ dayAndMonth(item.dueDate) }}</span></span
          >
          <Badge v-if="item.overdue" variant="highlight" data-slot="overdue">
            <Clock />{{ $t('period-dashboard.upcoming.overdue', daysOverdue(item.dueDate, today)) }}
          </Badge>
          <Badge v-else variant="neutral">{{ $t('period-dashboard.upcoming.open') }}</Badge>
        </div>
      </div>
    </div>
  </Card>
</template>
