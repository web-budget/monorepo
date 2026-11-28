<script setup lang="ts">
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const props = withDefaults(
  defineProps<{
    name: string
    label: string
    type?: 'text' | 'number' | 'date' | 'email'
    placeholder?: string
    autocomplete?: string
    inputmode?: 'numeric'
    disabled?: boolean
    maxlength?: number
    multiline?: boolean
    required?: boolean
    mono?: boolean
    hint?: string
    class?: string
  }>(),
  {
    type: 'text',
    placeholder: undefined,
    autocomplete: undefined,
    inputmode: undefined,
    disabled: false,
    maxlength: undefined,
    multiline: false,
    required: false,
    mono: false,
    hint: undefined,
    class: undefined,
  },
)

function openCalendar(event: MouseEvent) {
  if (props.type !== 'date') {
    return
  }
  try {
    ;(event.target as HTMLInputElement).showPicker?.()
  } catch {
    // showPicker throws NotAllowedError when the browser refuses to open the picker
  }
}
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
          :placeholder="placeholder"
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
          :autocomplete="autocomplete"
          :inputmode="inputmode"
          :maxlength="maxlength"
          :disabled="disabled"
          :class="mono && 'font-mono'"
          @click="openCalendar"
          @update:model-value="handleChange($event, errors.length > 0)"
          @blur="handleBlur"
        />
      </FormControl>
      <FormDescription v-if="hint">{{ hint }}</FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
