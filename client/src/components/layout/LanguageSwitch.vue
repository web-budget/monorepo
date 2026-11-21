<script setup lang="ts">
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  RadioGroupItem,
  RadioGroupRoot,
} from 'reka-ui'
import { cn } from '@/lib/utils'
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/locales/languages'
import { useLanguageStore } from '@/stores/language'

const props = defineProps<{ inMenu?: boolean }>()

const language = useLanguageStore()

const groupClass =
  'bg-muted text-muted-foreground inline-flex h-9 w-full items-center gap-0.5 rounded-md p-1'

const itemClass = cn(
  'hover:text-foreground inline-flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 font-mono text-sm font-medium whitespace-nowrap outline-hidden select-none',
  'focus-visible:ring-ring focus-visible:ring-2',
  'data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-xs',
)

function select(value: string | undefined) {
  language.select(value as SupportedLocale)
}
</script>

<template>
  <DropdownMenuRadioGroup
    v-if="props.inMenu"
    :model-value="language.locale"
    :aria-label="$t('layout.language')"
    :class="groupClass"
    @update:model-value="select($event as string)"
  >
    <DropdownMenuRadioItem
      v-for="locale in SUPPORTED_LOCALES"
      :key="locale"
      :value="locale"
      :aria-label="$t(`layout.language-${locale}`)"
      :class="itemClass"
      @select.prevent
    >
      {{ locale }}
    </DropdownMenuRadioItem>
  </DropdownMenuRadioGroup>

  <RadioGroupRoot
    v-else
    :model-value="language.locale"
    :aria-label="$t('layout.language')"
    :class="groupClass"
    @update:model-value="select($event as string)"
  >
    <RadioGroupItem
      v-for="locale in SUPPORTED_LOCALES"
      :key="locale"
      :value="locale"
      :aria-label="$t(`layout.language-${locale}`)"
      :class="itemClass"
    >
      {{ locale }}
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
