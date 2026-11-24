<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import type { PurchaseRecurringView } from '@/types'

defineProps<{
  recurringMovement?: PurchaseRecurringView | null
  table?: boolean
}>()
</script>

<template>
  <Badge v-if="recurringMovement?.installments != null" variant="outline" data-slot="installment">
    <RefreshCw v-if="table" />{{ recurringMovement.installment }}/{{
      recurringMovement.installments
    }}
  </Badge>
  <Badge v-else-if="recurringMovement && table" variant="outline" data-slot="installment">
    <RefreshCw />{{ $t('credit-card-invoice.purchases.recurring') }}
  </Badge>
</template>
