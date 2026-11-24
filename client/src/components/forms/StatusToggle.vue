<script setup lang="ts">
import { useField } from 'vee-validate'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{ name: string; label?: string; hint?: string; heading?: string; class?: string }>(),
  { label: undefined, hint: undefined, heading: undefined, class: undefined },
)

const { value } = useField<boolean>(() => props.name)
</script>

<template>
  <div :class="cn('grid content-start gap-2 md:col-span-2', props.class)">
    <span v-if="heading !== ''" class="text-sm leading-none font-medium">{{
      heading ?? $t('crud.status')
    }}</span>
    <Label class="flex h-9 items-center gap-2.5 font-normal">
      <Switch :model-value="value" @update:model-value="value = $event" />
      {{ label ?? $t('status.active') }}
    </Label>
    <span v-if="hint" class="text-muted-foreground text-xs">{{ hint }}</span>
  </div>
</template>
