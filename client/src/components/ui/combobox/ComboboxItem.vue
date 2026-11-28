<script setup lang="ts">
import type { ComboboxItemEmits, ComboboxItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Check } from 'lucide-vue-next'
import { ComboboxItem, ComboboxItemIndicator, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<ComboboxItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<ComboboxItemEmits>()

const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <ComboboxItem
    data-slot="combobox-item"
    v-bind="forwarded"
    :class="
      cn(
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground flex h-8 w-full cursor-default items-center gap-2 rounded-sm px-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 pointer-coarse:h-11',
        props.class,
      )
    "
  >
    <span class="min-w-0 flex-1 truncate"><slot /></span>
    <ComboboxItemIndicator class="shrink-0">
      <Check class="size-4" aria-hidden="true" />
    </ComboboxItemIndicator>
  </ComboboxItem>
</template>
