<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { ref } from 'vue'
import { LANGUAGE_NAMES, SUPPORTED_LOCALES, type SupportedLocale } from '@/locales/languages'
import { useLanguageStore } from '@/stores/language'

const language = useLanguageStore()
const saved = ref(false)

async function select(value: string | undefined) {
  saved.value = false
  try {
    await language.select(value as SupportedLocale)
  } catch {
    return
  }
  saved.value = true
}
</script>

<template>
  <div class="min-h-0 overflow-auto p-5 max-md:p-4">
    <div class="grid gap-2">
      <p class="text-sm font-medium">{{ $t('account.preferences.language') }}</p>
      <p class="text-muted-foreground text-xs">{{ $t('account.preferences.help') }}</p>
      <RadioGroupRoot
        :model-value="language.locale"
        :aria-label="$t('account.preferences.language')"
        class="grid gap-2 md:grid-cols-2"
        @update:model-value="select($event as string)"
      >
        <RadioGroupItem
          v-for="locale in SUPPORTED_LOCALES"
          :key="locale"
          :value="locale"
          class="border-border bg-card text-card-foreground focus-visible:ring-ring data-[state=checked]:border-ring data-[state=checked]:ring-ring/30 data-[state=checked]:bg-accent flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left outline-hidden focus-visible:ring-2 data-[state=checked]:ring-[3px]"
        >
          <span
            class="border-input bg-card grid size-4 flex-none place-content-center rounded-full border"
            :class="language.locale === locale && 'border-primary'"
          >
            <span v-if="language.locale === locale" class="bg-primary size-2 rounded-full" />
          </span>
          <span class="flex-1 text-sm font-medium" :lang="locale">{{
            LANGUAGE_NAMES[locale]
          }}</span>
          <span class="text-muted-foreground font-mono text-[11px]">{{ locale }}</span>
        </RadioGroupItem>
      </RadioGroupRoot>
      <span v-if="saved" class="text-income flex items-center gap-1.5 text-xs" data-slot="saved">
        <Check class="size-3.5" />
        {{ $t('account.preferences.saved') }}
      </span>
    </div>
  </div>
</template>
