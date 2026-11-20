<script setup lang="ts">
import { useField } from 'vee-validate'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const props = defineProps<{ name: string; label: string; hint: string }>()

const { value } = useField<boolean>(() => props.name)
</script>

<template>
  <section
    class="grid items-center gap-x-8 gap-y-2 border-b px-5 py-3.5 md:grid-cols-[220px_minmax(0,1fr)]"
  >
    <div class="grid gap-0.5">
      <h2 class="text-sm leading-6 font-semibold">{{ $t('crud.status') }}</h2>
      <p class="text-muted-foreground text-xs">{{ hint }}</p>
    </div>
    <Label class="flex h-6 items-center gap-2.5 font-normal">
      <Switch :model-value="value" @update:model-value="value = $event" />
      {{ label }}
    </Label>
  </section>
</template>
