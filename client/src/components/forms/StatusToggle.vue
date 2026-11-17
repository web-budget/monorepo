<script setup lang="ts">
import { useField } from 'vee-validate'
import { Button } from '@/components/ui/button'

const props = defineProps<{ name: string }>()

const stateOptions = [
  { label: 'status.active', value: true },
  { label: 'status.inactive', value: false },
]

const { value } = useField<boolean>(() => props.name)
</script>

<template>
  <div class="inline-flex rounded-md border" role="group">
    <Button
      v-for="option in stateOptions"
      :key="option.label"
      type="button"
      size="sm"
      class="rounded-none first:rounded-l-md last:rounded-r-md"
      :variant="value === option.value ? 'default' : 'ghost'"
      :aria-pressed="value === option.value"
      @click="value = option.value"
    >
      {{ $t(option.label) }}
    </Button>
  </div>
</template>
