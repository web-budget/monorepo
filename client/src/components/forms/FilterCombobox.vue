<script setup lang="ts">
import ComboboxPicker from '@/components/forms/ComboboxPicker.vue'
import { Label } from '@/components/ui/label'
import type { ComboboxOption } from '@/utils/comboboxSearch'

const props = defineProps<{
  label: string
  options: ComboboxOption[]
  searchPlaceholder: string
  emptyMessage: string
  noneLabel?: string
  loading?: boolean
  class?: string
  hideLabel?: boolean
  required?: boolean
}>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <div :class="['grid min-w-0 content-start gap-2', props.class]">
    <Label v-if="!hideLabel">
      {{ label }}
      <span v-if="required" class="text-destructive" aria-hidden="true">*</span>
    </Label>
    <ComboboxPicker
      v-model="model"
      :options="options"
      :none-label="noneLabel"
      :search-placeholder="searchPlaceholder"
      :empty-message="emptyMessage"
      :loading-message="$t('form.combobox.loading')"
      :trigger-label="label"
      :loading="loading"
    />
  </div>
</template>
