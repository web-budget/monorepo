<script setup lang="ts">
import { CalendarClock } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ImportView } from '@/types'

const props = defineProps<{ item: ImportView }>()

defineEmits<{ showRecurring: [] }>()

const { n, d } = useI18n()

const wallet = computed(() => props.item.target === 'WALLET')
const before = computed(() =>
  wallet.value ? (props.item.warnings.ledgerBalance ?? 0) : (props.item.warnings.fileTotal ?? 0),
)
const difference = computed(() => props.item.warnings.afterSave - before.value)
const differenceText = computed(() => {
  const formatted = n(Math.abs(difference.value), 'currency')
  return difference.value < 0 ? `−${formatted}` : formatted
})
const ledgerDate = computed(() =>
  props.item.ledgerBalanceOn ? d(`${props.item.ledgerBalanceOn}T00:00:00`, 'short') : '',
)
const unlinked = computed(() => props.item.warnings.unlinkedRecurring.length)
</script>

<template>
  <div class="grid gap-3" data-slot="draft-totals">
    <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Card class="grid content-start gap-1 p-4" data-slot="total-lines">
        <span class="text-muted-foreground text-xs">{{ $t('imports.draft.totals.lines') }}</span>
        <span class="font-mono text-xl font-semibold tracking-tight tabular-nums md:text-2xl">
          {{ item.totals.lines }}
        </span>
        <span class="text-muted-foreground text-xs">
          {{ $t('imports.draft.totals.ignored', item.totals.ignored) }}
        </span>
      </Card>
      <Card class="grid content-start gap-1 p-4" data-slot="total-pending">
        <span class="text-muted-foreground text-xs">{{ $t('imports.draft.totals.pending') }}</span>
        <span class="font-mono text-xl font-semibold tracking-tight tabular-nums md:text-2xl">
          {{ item.totals.pending }}
        </span>
        <span class="text-muted-foreground text-xs">
          {{ item.totals.pending === 0 ? $t('imports.draft.all-resolved') : '' }}
        </span>
      </Card>
      <Card class="grid content-start gap-1 p-4" data-slot="total-before">
        <span class="text-muted-foreground text-xs">
          {{ $t(wallet ? 'imports.draft.totals.ledger' : 'imports.draft.totals.file') }}
        </span>
        <CurrencyDisplay
          :value="before"
          :signed="before < 0"
          class="text-xl font-semibold tracking-tight md:text-2xl"
        />
        <span class="text-muted-foreground text-xs">
          {{
            wallet
              ? $t('imports.draft.totals.ledger-on', { date: ledgerDate })
              : $t('imports.draft.totals.without-payment')
          }}
        </span>
      </Card>
      <Card class="grid content-start gap-1 p-4" data-slot="total-after">
        <span class="text-muted-foreground text-xs">
          {{ $t(wallet ? 'imports.draft.totals.balance-after' : 'imports.draft.totals.invoice-after') }}
        </span>
        <CurrencyDisplay
          :value="item.warnings.afterSave"
          :signed="item.warnings.afterSave < 0"
          class="text-xl font-semibold tracking-tight md:text-2xl"
        />
        <span class="text-muted-foreground text-xs">
          {{ $t('imports.draft.totals.difference', { value: differenceText }) }}
          <template v-if="!wallet && item.warnings.ignoredCredits !== 0">
            ·
            {{
              $t('imports.draft.totals.credits', {
                value: n(Math.abs(item.warnings.ignoredCredits), 'currency'),
              })
            }}
          </template>
        </span>
      </Card>
    </div>
    <div
      v-if="unlinked > 0"
      class="border-highlight bg-highlight/35 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-md border px-4 py-2 text-sm"
      role="status"
      data-slot="unlinked-recurring"
    >
      <span class="flex items-center gap-2.5 font-medium">
        <CalendarClock class="text-highlight-foreground size-4" />
        {{ $t('imports.draft.recurring.alert', unlinked) }}
      </span>
      <Button type="button" variant="outline" size="sm" @click="$emit('showRecurring')">
        {{ $t('imports.draft.recurring.show', unlinked) }}
      </Button>
    </div>
  </div>
</template>
