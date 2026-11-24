<script setup lang="ts">
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NONE = '__none__'

withDefaults(
  defineProps<{
    name: string
    label: string
    options: { label: string; value: string }[]
    placeholder?: string
    noneLabel?: string
    disabled?: boolean
    required?: boolean
    hint?: string
    class?: string
  }>(),
  {
    placeholder: undefined,
    noneLabel: undefined,
    disabled: false,
    required: false,
    hint: undefined,
    class: undefined,
  },
)
</script>

<template>
  <FormField v-slot="{ componentField }" :name="name">
    <FormItem :class="$props.class">
      <FormLabel :required="required">{{ label }}</FormLabel>
      <Select
        :model-value="
          noneLabel !== undefined && !componentField.modelValue ? NONE : componentField.modelValue
        "
        :disabled="disabled"
        @update:model-value="
          (value: unknown) => componentField['onUpdate:modelValue']?.(value === NONE ? null : value)
        "
      >
        <FormControl>
          <SelectTrigger class="w-full">
            <SelectValue :placeholder="placeholder" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem v-if="noneLabel !== undefined" :value="NONE">{{ noneLabel }}</SelectItem>
          <SelectItem v-for="option in options" :key="option.value" :value="option.value">
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <FormDescription v-if="hint">{{ hint }}</FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
