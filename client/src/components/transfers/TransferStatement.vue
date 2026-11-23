<script setup lang="ts">
import { computed } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'

interface StatementWallet {
  name: string
  balance: number | null
}

const props = defineProps<{
  from: StatementWallet | null
  to: StatementWallet | null
  value: number
}>()

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
  <div class="grid gap-4" data-slot="transfer-statement">
    <section v-for="side in sides" :key="side.key" :data-side="side.key" class="grid gap-2">
      <h3 class="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
        {{ $t(`transfer.statement.${side.key}`) }}
      </h3>
      <p class="text-sm font-medium">{{ side.name ?? '---' }}</p>
      <dl class="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5 text-sm">
        <dt class="text-muted-foreground">{{ $t('transfer.statement.before') }}</dt>
        <dd class="text-right"><CurrencyDisplay :value="side.before" /></dd>
        <dt class="text-muted-foreground">
          {{ $t(side.key === 'from' ? 'transfer.statement.debit' : 'transfer.statement.credit') }}
        </dt>
        <dd class="text-right"><CurrencyDisplay :value="side.amount" signed /></dd>
        <dt class="font-semibold">{{ $t('transfer.statement.after') }}</dt>
        <dd class="text-right font-semibold"><CurrencyDisplay :value="side.after" /></dd>
      </dl>
    </section>
  </div>
</template>
