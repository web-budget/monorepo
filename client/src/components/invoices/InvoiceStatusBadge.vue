<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import type { InvoiceStatus } from '@/types'

const VARIANTS = { OPEN: 'neutral', CLOSED: 'pending', PAID: 'approved' } as const

defineProps<{ status: InvoiceStatus }>()
</script>

<template>
  <Badge :variant="VARIANTS[status]">{{ $t(`credit-card-invoice.status.${status}`) }}</Badge>
</template>
