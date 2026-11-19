<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'

defineProps<{
  name: string
  label: string
  options: { value: string; label: string; description: string }[]
}>()

function toggle(selected: string[], role: string, checked: boolean | 'indeterminate') {
  return checked === true ? [...selected, role] : selected.filter((candidate) => candidate !== role)
}
</script>

<template>
  <FormField v-slot="{ value, handleChange }" :name="name">
    <FormItem class="md:col-span-2">
      <FormLabel class="sr-only">{{ label }}</FormLabel>
      <div class="grid gap-2 md:grid-cols-2">
        <Label
          v-for="option in options"
          :key="option.value"
          :for="`${name}-${option.value}`"
          :data-on="value.includes(option.value) || undefined"
          class="data-[on]:border-primary data-[on]:bg-accent bg-card flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 font-normal"
        >
          <Checkbox
            :id="`${name}-${option.value}`"
            class="mt-0.5"
            :model-value="value.includes(option.value)"
            @update:model-value="handleChange(toggle(value, option.value, $event))"
          />
          <span class="grid gap-0.5">
            <span class="font-medium">{{ option.label }}</span>
            <span class="text-muted-foreground text-xs">{{ option.description }}</span>
          </span>
        </Label>
      </div>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
