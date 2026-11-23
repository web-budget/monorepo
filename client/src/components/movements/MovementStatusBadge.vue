<script setup lang="ts">
import { Clock } from 'lucide-vue-next'
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import type { MovementStatus } from '@/types'
import { daysOverdue } from '@/utils/movements'

const props = defineProps<{ status: MovementStatus; overdue: boolean; dueDate: string }>()

const days = computed(() => daysOverdue(props.dueDate))
</script>

<template>
  <Badge v-if="overdue" variant="pending">
    <Clock />
    {{
      days > 0 ? $t('movement.status.overdue-days', { days }, days) : $t('movement.status.overdue')
    }}
  </Badge>
  <Badge v-else-if="status === 'PAID'" variant="approved">{{ $t('movement.status.paid') }}</Badge>
  <Badge v-else variant="neutral">{{ $t('movement.status.open') }}</Badge>
</template>
