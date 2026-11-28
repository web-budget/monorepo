<script setup lang="ts">
import type { ComboboxTriggerProps } from 'reka-ui'
import { ComboboxTrigger, useForwardProps } from 'reka-ui'

const props = defineProps<ComboboxTriggerProps>()
const forwarded = useForwardProps(props)
</script>

<template>
  <ComboboxTrigger data-slot="combobox-trigger" v-bind="forwarded">
    <slot />
  </ComboboxTrigger>
</template>
