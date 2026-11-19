<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ name: string }>()

const initials = computed(() => {
  const letters = props.name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0))
  const short =
    letters.length > 1
      ? [letters[0], letters[letters.length - 1]].join('')
      : props.name.trim().slice(0, 2)
  return short.toUpperCase()
})
</script>

<template>
  <span
    aria-hidden="true"
    class="bg-secondary text-secondary-foreground inline-grid size-8 shrink-0 place-content-center rounded-md font-mono text-xs font-medium"
  >
    {{ initials }}
  </span>
</template>
