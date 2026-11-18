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
    required?: boolean
    mono?: boolean
    class?: string
  }>(),
  {
    type: 'text',
    placeholder: undefined,
    disabled: false,
    maxlength: undefined,
    multiline: false,
    required: false,
    mono: false,
    class: undefined,
  },
)
</script>

<template>
  <FormField
    v-slot="{ value, errors, handleChange, handleBlur }"
    :name="name"
    :validate-on-model-update="false"
  >
    <FormItem :class="$props.class">
      <FormLabel :required="required">{{ label }}</FormLabel>
      <FormControl>
        <Textarea
          v-if="multiline"
          :name="name"
          :model-value="value"
          rows="4"
          :disabled="disabled"
          @update:model-value="handleChange($event, errors.length > 0)"
          @blur="handleBlur"
        />
        <Input
          v-else
          :name="name"
          :model-value="value"
          :type="type"
          :step="type === 'number' ? 'any' : undefined"
          :placeholder="placeholder"
          :maxlength="maxlength"
          :disabled="disabled"
          :class="mono && 'font-mono'"
          @update:model-value="handleChange($event, errors.length > 0)"
          @blur="handleBlur"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
