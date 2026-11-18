<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox'
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Label } from '@/components/ui/label'

defineProps<{ name: string; label: string; options: { value: string; label: string }[] }>()

function toggle(selected: string[], role: string, checked: boolean | 'indeterminate') {
  return checked === true ? [...selected, role] : selected.filter((candidate) => candidate !== role)
}
</script>

<template>
  <FormField v-slot="{ value, handleChange }" :name="name">
    <FormItem>
      <FormLabel>{{ label }}</FormLabel>
      <div class="grid gap-2 md:grid-cols-2">
        <div v-for="option in options" :key="option.value" class="flex items-center gap-2">
          <Checkbox
            :id="`${name}-${option.value}`"
            :model-value="value.includes(option.value)"
            @update:model-value="handleChange(toggle(value, option.value, $event))"
          />
          <Label :for="`${name}-${option.value}`">{{ option.label }}</Label>
        </div>
      </div>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
