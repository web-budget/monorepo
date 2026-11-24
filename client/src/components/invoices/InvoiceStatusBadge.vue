<script setup lang="ts">
import { Lock } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import type { InvoiceStatus } from '@/types'

defineProps<{ status: InvoiceStatus }>()
</script>

<template>
  <Badge v-if="status === 'OPEN'" variant="pending">{{
    $t('credit-card-invoice.status.OPEN')
  }}</Badge>
  <Badge v-else-if="status === 'CLOSED'" variant="neutral">
    <Lock />{{ $t('credit-card-invoice.status.CLOSED') }}
  </Badge>
  <Badge v-else variant="approved">{{ $t('credit-card-invoice.status.PAID') }}</Badge>
</template>
