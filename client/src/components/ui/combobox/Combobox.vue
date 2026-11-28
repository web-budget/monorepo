<script setup lang="ts">
import type { ComboboxRootEmits, ComboboxRootProps } from 'reka-ui'
import { ComboboxRoot, useForwardExpose, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<ComboboxRootProps>()
const emits = defineEmits<ComboboxRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
const { forwardRef } = useForwardExpose()
</script>

<template>
  <ComboboxRoot :ref="forwardRef" v-slot="slotProps" data-slot="combobox" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </ComboboxRoot>
</template>
