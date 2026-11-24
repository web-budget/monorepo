<script setup lang="ts">
import { useField } from 'vee-validate'
import type { Component } from 'vue'
import { Label } from '@/components/ui/label'

const props = withDefaults(
  defineProps<{
    name: string
    options: { label: string; value: string; icon?: Component }[]
    label?: string
    required?: boolean
    class?: string
  }>(),
  { label: undefined, required: false, class: undefined },
)

const { value } = useField<string>(() => props.name)
</script>

<template>
  <div :class="['grid content-start gap-2', props.class]">
    <Label v-if="label"> {{ label }}<span v-if="required" class="text-destructive">*</span> </Label>
    <div
      class="bg-muted text-muted-foreground inline-flex h-9 w-fit max-w-full items-center gap-0.5 rounded-md p-1"
      role="group"
      :aria-label="label ?? name"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :aria-pressed="value === option.value"
        class="aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs hover:text-foreground inline-flex h-7 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium whitespace-nowrap transition-colors [&>svg]:size-3.5"
        @click="value = option.value"
      >
        <component :is="option.icon" v-if="option.icon" />
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
