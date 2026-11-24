<script setup lang="ts">
import { CreditCard } from 'lucide-vue-next'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { FinancialPeriodCreationPreview } from '@/types'

defineProps<{ preview: FinancialPeriodCreationPreview }>()
</script>

<template>
  <Card class="divide-border content-start gap-0 divide-y py-0" data-slot="creation-preview">
    <div class="grid gap-2 p-4">
      <p class="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
        {{ $t('financial-period.creation.title') }}
      </p>
      <p class="text-sm">{{ $t('financial-period.creation.recurring') }}</p>
      <ul class="grid gap-1 text-sm">
        <li
          v-for="recurringMovement in preview.recurringMovements"
          :key="recurringMovement.id"
          class="flex items-center justify-between gap-3"
        >
          <span class="min-w-0 truncate">
            {{ recurringMovement.name }}
            <Badge
              v-if="recurringMovement.installment != null && recurringMovement.installments != null"
              variant="outline"
            >
              {{ recurringMovement.installment }}/{{ recurringMovement.installments }}
            </Badge>
          </span>
          <CurrencyDisplay
            class="shrink-0"
            :value="
              recurringMovement.type === 'INCOME'
                ? recurringMovement.value
                : -recurringMovement.value
            "
            signed
            glued
            bare
          />
        </li>
      </ul>
    </div>
    <div class="grid gap-2 p-4">
      <p class="text-sm">{{ $t('financial-period.creation.invoices') }}</p>
      <ul class="grid gap-1 text-sm">
        <li v-for="invoice in preview.invoices" :key="invoice.id" class="flex items-center gap-2">
          <CreditCard class="text-muted-foreground size-4" />{{ invoice.name }}
          <span class="text-muted-foreground font-mono text-xs"
            >••{{ invoice.lastFourDigits }}</span
          >
        </li>
      </ul>
    </div>
  </Card>
</template>
