<script setup lang="ts">
import { Clock, Lock } from 'lucide-vue-next'
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import type { FinancialPeriodStatus } from '@/types'

const props = defineProps<{ status: FinancialPeriodStatus; expired?: boolean }>()

const key = computed(() => {
  if (props.status === 'CLOSED') {
    return 'closed'
  }
  return props.expired ? 'expired' : 'open'
})
</script>

<template>
  <Badge v-if="key === 'closed'" variant="neutral">
    <Lock />{{ $t('financial-period.status.closed') }}
  </Badge>
  <Badge v-else-if="key === 'expired'" variant="pending">
    <Clock />{{ $t('financial-period.status.expired') }}
  </Badge>
  <Badge v-else variant="approved">{{ $t('financial-period.status.open') }}</Badge>
</template>
