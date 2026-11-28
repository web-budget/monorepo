<script setup lang="ts">
import type { ComboboxInputEmits, ComboboxInputProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Search } from 'lucide-vue-next'
import { ComboboxInput, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = defineProps<ComboboxInputProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<ComboboxInputEmits>()

const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <div
    data-slot="combobox-search"
    class="text-muted-foreground border-border flex h-9 items-center gap-2 border-b px-3 pointer-coarse:h-11"
  >
    <Search class="size-4 shrink-0" aria-hidden="true" />
    <ComboboxInput
      data-slot="combobox-input"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'text-popover-foreground placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent p-0 text-sm outline-hidden pointer-coarse:text-base',
          props.class,
        )
      "
    />
  </div>
</template>
