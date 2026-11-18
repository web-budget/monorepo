<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

const props = withDefaults(defineProps<{ active?: boolean }>(), { active: false })
</script>

<template>
  <Badge v-if="props.active" class="bg-emerald-600 text-white dark:bg-emerald-700">
    {{ $t('status.active') }}
  </Badge>
  <Badge v-else variant="destructive">{{ $t('status.inactive') }}</Badge>
</template>
