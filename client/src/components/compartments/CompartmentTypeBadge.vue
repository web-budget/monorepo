<script setup lang="ts">
import { typeKey } from '@/utils/typeLabels'
import { Badge } from '@/components/ui/badge'
import { COMPARTMENT_TYPE_ICONS } from '@/utils/compartments'
import type { CompartmentType } from '@/types'

defineProps<{ type: CompartmentType }>()
</script>

<template>
  <Badge variant="outline" class="!font-sans !text-xs">
    <component :is="COMPARTMENT_TYPE_ICONS[type]" />{{ $t(typeKey('compartment', type)) }}
  </Badge>
</template>
