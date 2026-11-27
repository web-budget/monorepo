<script setup lang="ts">
import { CreditCard, Wallet } from 'lucide-vue-next'
import type { ImportListView } from '@/types'
import { destinationName } from '@/utils/imports'

defineProps<{ source: Pick<ImportListView, 'target' | 'card' | 'wallet'> }>()
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <CreditCard v-if="source.target === 'CARD'" class="text-muted-foreground size-4" />
    <Wallet v-else class="text-muted-foreground size-4" />
    {{ destinationName(source) }}
  </span>
</template>
