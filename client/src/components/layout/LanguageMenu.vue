<script setup lang="ts">
import { Check, ChevronDown, Languages } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LANGUAGE_NAMES, SUPPORTED_LOCALES, type SupportedLocale } from '@/locales/languages'
import { useLanguageStore } from '@/stores/language'

const language = useLanguageStore()

function select(value: unknown) {
  language.select(value as SupportedLocale)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" :aria-label="$t('layout.language')">
        <Languages />
        <span :lang="language.locale">{{ LANGUAGE_NAMES[language.locale] }}</span>
        <ChevronDown class="text-muted-foreground" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-60">
      <DropdownMenuRadioGroup :model-value="language.locale" @update:model-value="select($event)">
        <DropdownMenuRadioItem v-for="locale in SUPPORTED_LOCALES" :key="locale" :value="locale">
          <template #indicator-icon>
            <Check class="text-foreground" />
          </template>
          <span class="flex-1 text-left" :lang="locale">{{ LANGUAGE_NAMES[locale] }}</span>
          <span class="text-muted-foreground font-mono text-[11px]">{{ locale }}</span>
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
