<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import type { FinancialPeriodStatus } from '@/types'

defineProps<{ status: FinancialPeriodStatus }>()

const statusClasses: Record<FinancialPeriodStatus, string> = {
  ACTIVE: 'bg-emerald-600 text-white dark:bg-emerald-700',
  ENDED: 'bg-amber-500 text-white dark:bg-amber-600',
  ACCOUNTED: 'bg-destructive text-white',
}
</script>

<template>
  <Badge :class="statusClasses[status]">
    {{ $t(`financial-period.status.${status.toLowerCase()}`) }}
  </Badge>
</template>
