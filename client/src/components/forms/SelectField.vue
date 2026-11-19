<script setup lang="ts">
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

withDefaults(
  defineProps<{
    name: string
    label: string
    options: { label: string; value: string }[]
    placeholder?: string
    disabled?: boolean
    required?: boolean
    class?: string
  }>(),
  { placeholder: undefined, disabled: false, required: false, class: undefined },
)
</script>

<template>
  <FormField v-slot="{ componentField }" :name="name">
    <FormItem :class="$props.class">
      <FormLabel :required="required">{{ label }}</FormLabel>
      <Select v-bind="componentField" :disabled="disabled">
        <FormControl>
          <SelectTrigger class="w-full">
            <SelectValue :placeholder="placeholder" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem v-for="option in options" :key="option.value" :value="option.value">
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
