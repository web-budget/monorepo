<script setup lang="ts">
import { Clock, CreditCard } from 'lucide-vue-next'
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import type { MovementStatus } from '@/types'
import { daysOverdue } from '@/utils/movements'

const props = defineProps<{
  status: MovementStatus
  overdue: boolean
  dueDate: string
  onCard?: boolean
}>()

const days = computed(() => daysOverdue(props.dueDate))
</script>

<template>
  <Badge v-if="overdue" variant="highlight">
    <Clock />
    {{
      days > 0 ? $t('movement.status.overdue-days', { days }, days) : $t('movement.status.overdue')
    }}
  </Badge>
  <Badge v-else-if="status === 'PAID'" variant="approved">
    <CreditCard v-if="onCard" />
    {{ $t(onCard ? 'movement.status.paid-on-card' : 'movement.status.paid') }}
  </Badge>
  <Badge v-else variant="neutral">{{ $t('movement.status.open') }}</Badge>
</template>
