<script setup lang="ts">
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

withDefaults(
  defineProps<{
    name: string
    label: string
    type?: 'text' | 'number' | 'date'
    placeholder?: string
    disabled?: boolean
    maxlength?: number
    multiline?: boolean
  }>(),
  { type: 'text', placeholder: undefined, disabled: false, maxlength: undefined, multiline: false },
)
</script>

<template>
  <FormField v-slot="{ componentField }" :name="name">
    <FormItem>
      <FormLabel>{{ label }}</FormLabel>
      <FormControl>
        <Textarea v-if="multiline" v-bind="componentField" rows="4" :disabled="disabled" />
        <Input
          v-else
          v-bind="componentField"
          :type="type"
          :step="type === 'number' ? 'any' : undefined"
          :placeholder="placeholder"
          :maxlength="maxlength"
          :disabled="disabled"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
