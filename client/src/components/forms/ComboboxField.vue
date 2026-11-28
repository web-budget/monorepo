<script setup lang="ts">
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import ComboboxPicker from '@/components/forms/ComboboxPicker.vue'
import type { ComboboxOption } from '@/utils/comboboxSearch'

withDefaults(
  defineProps<{
    name: string
    label: string
    options: ComboboxOption[]
    searchPlaceholder: string
    emptyMessage: string
    placeholder?: string
    noneLabel?: string
    disabled?: boolean
    loading?: boolean
    required?: boolean
    hint?: string
    class?: string
  }>(),
  {
    placeholder: undefined,
    noneLabel: undefined,
    disabled: false,
    loading: false,
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
      <FormControl>
        <ComboboxPicker
          :model-value="componentField.modelValue"
          :options="options"
          :placeholder="placeholder"
          :none-label="noneLabel"
          :search-placeholder="searchPlaceholder"
          :empty-message="emptyMessage"
          :loading-message="$t('form.combobox.loading')"
          :trigger-label="label"
          :disabled="disabled"
          :loading="loading"
          @update:model-value="
            (value) => componentField['onUpdate:modelValue']?.(value === '' ? null : value)
          "
        />
      </FormControl>
      <FormDescription v-if="hint">{{ hint }}</FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
