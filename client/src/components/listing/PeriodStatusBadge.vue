<script setup lang="ts">
import { Badge, type BadgeVariants } from '@/components/ui/badge'
import type { FinancialPeriodStatus } from '@/types'

defineProps<{ status: FinancialPeriodStatus }>()

const statusVariants: Record<FinancialPeriodStatus, BadgeVariants['variant']> = {
  ACTIVE: 'approved',
  ENDED: 'pending',
  ACCOUNTED: 'neutral',
}
</script>

<template>
  <Badge :variant="statusVariants[status]">
    {{ $t(`financial-period.status.${status.toLowerCase()}`) }}
  </Badge>
</template>
