<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import type { UserStatus } from '@/types'

defineProps<{ status: UserStatus }>()

const VARIANTS = { APPROVED: 'approved', PENDING: 'pending', BLOCKED: 'blocked' } as const
</script>

<template>
  <Badge :variant="VARIANTS[status]">{{ $t(`users.status.${status.toLowerCase()}`) }}</Badge>
</template>
