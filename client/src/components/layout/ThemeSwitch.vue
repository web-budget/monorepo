<script setup lang="ts">
import { Monitor, Moon, Sun } from 'lucide-vue-next'
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  RadioGroupItem,
  RadioGroupRoot,
} from 'reka-ui'
import { cn } from '@/lib/utils'
import { themeModes, useAppearanceStore, type ThemeMode } from '@/stores/appearance'

const props = defineProps<{ inMenu?: boolean; iconOnly?: boolean }>()

const appearance = useAppearanceStore()

const icons = { light: Sun, dark: Moon, system: Monitor }

const groupClass =
  'bg-muted text-muted-foreground inline-flex h-9 w-full items-center gap-0.5 rounded-md p-1'

const itemClass = cn(
  'hover:text-foreground inline-flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium whitespace-nowrap outline-hidden select-none',
  'focus-visible:ring-ring focus-visible:ring-2',
  'data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-xs',
  '[&_svg]:size-3.5',
)

function select(value: string | undefined) {
  appearance.setMode(value as ThemeMode)
}
</script>

<template>
  <DropdownMenuRadioGroup
    v-if="props.inMenu"
    :model-value="appearance.mode"
    :aria-label="$t('layout.theme')"
    :class="groupClass"
    @update:model-value="select($event as string)"
  >
    <DropdownMenuRadioItem
      v-for="mode in themeModes"
      :key="mode"
      :value="mode"
      :class="itemClass"
      @select.prevent
    >
      <component :is="icons[mode]" />
      {{ $t(`layout.theme-${mode}`) }}
    </DropdownMenuRadioItem>
  </DropdownMenuRadioGroup>

  <RadioGroupRoot
    v-else
    :model-value="appearance.mode"
    :aria-label="$t('layout.theme')"
    :class="groupClass"
    @update:model-value="select($event as string)"
  >
    <RadioGroupItem
      v-for="mode in themeModes"
      :key="mode"
      :value="mode"
      :aria-label="$t(`layout.theme-${mode}`)"
      :class="itemClass"
    >
      <component :is="icons[mode]" />
      <template v-if="!props.iconOnly">{{ $t(`layout.theme-${mode}`) }}</template>
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
