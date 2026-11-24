<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import type { WalletEntryOrigin } from '@/types'
import { ORIGIN_APPEARANCE } from '@/utils/statement'

defineProps<{ origin: WalletEntryOrigin }>()
</script>

<template>
  <Badge :variant="ORIGIN_APPEARANCE[origin].variant" :class="ORIGIN_APPEARANCE[origin].classes">
    <component :is="ORIGIN_APPEARANCE[origin].icon" />{{ $t(`statement.origin.${origin}`) }}
  </Badge>
</template>
