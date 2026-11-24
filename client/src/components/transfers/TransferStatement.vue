<script setup lang="ts">
import { computed } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'

interface StatementWallet {
  name: string
  balance: number | null
}

const props = defineProps<{
  title: string
  from: StatementWallet | null
  to: StatementWallet | null
  value: number
}>()

const now = new Date()
const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19)

function describe(key: 'from' | 'to', wallet: StatementWallet | null, amount: number) {
  const before = wallet?.balance ?? null
  return {
    key,
    name: wallet?.name,
    before,
    amount,
    after: before === null ? null : before + amount,
  }
}

const sides = computed(() => [
  describe('from', props.from, -props.value),
  describe('to', props.to, props.value),
])
</script>

<template>
  <aside
    class="border-border bg-muted/40 grid content-start gap-4 rounded-md border p-4"
    :aria-label="title"
    data-slot="transfer-statement"
  >
    <p
      class="text-muted-foreground flex items-center justify-between text-[11px] font-medium tracking-wider uppercase"
    >
      <span>{{ title }}</span>
      <DateTimeDisplay class="font-mono" :value="today" />
    </p>
    <template v-for="(side, index) in sides" :key="side.key">
      <hr v-if="index > 0" class="border-border border-t border-dashed" />
      <div :data-side="side.key" class="grid gap-1.5 font-mono text-[13px] tabular-nums">
        <p class="font-sans text-sm font-semibold">{{ side.name ?? '---' }}</p>
        <div class="flex items-baseline gap-2">
          <span class="text-muted-foreground">{{ $t('transfer.statement.before') }}</span>
          <span class="border-border flex-1 border-b border-dotted" />
          <CurrencyDisplay :value="side.before" neutral />
        </div>
        <div
          :class="[
            'flex items-baseline gap-2',
            side.key === 'from' ? 'text-expense' : 'text-income',
          ]"
        >
          <span class="text-muted-foreground">
            {{ $t(side.key === 'from' ? 'transfer.statement.debit' : 'transfer.statement.credit') }}
          </span>
          <span class="border-border flex-1 border-b border-dotted" />
          <CurrencyDisplay :value="side.amount" signed glued />
        </div>
        <div class="border-border flex items-baseline gap-2 border-t pt-1.5 font-semibold">
          <span class="text-foreground">{{ $t('transfer.statement.after') }}</span>
          <span class="border-border flex-1 border-b border-dotted" />
          <CurrencyDisplay :value="side.after" neutral />
        </div>
      </div>
    </template>
  </aside>
</template>
