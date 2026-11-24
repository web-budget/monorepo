<script setup lang="ts">
import { computed } from 'vue'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NONE = '__none__'

const props = defineProps<{
  label: string
  noneLabel?: string
  options: { label: string; value: string }[]
  class?: string
  hideLabel?: boolean
}>()

const model = defineModel<string>({ required: true })

const selected = computed({
  get: () => (model.value === '' ? NONE : model.value),
  set: (value: string) => {
    model.value = value === NONE ? '' : value
  },
})
</script>

<template>
  <div :class="['grid min-w-0 content-start gap-2', props.class]">
    <Label v-if="!hideLabel">{{ label }}</Label>
    <Select v-model="selected">
      <SelectTrigger class="w-full min-w-0" :aria-label="label">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-if="noneLabel !== undefined" :value="NONE">{{ noneLabel }}</SelectItem>
        <SelectItem v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
