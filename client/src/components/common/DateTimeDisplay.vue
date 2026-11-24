<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{ value: string; type?: 'short' | 'long'; fixTime?: boolean; withTime?: boolean }>(),
  { type: 'short', fixTime: false, withTime: false },
)

const { d, locale } = useI18n()

const valueToDisplay = computed(() =>
  props.fixTime ? new Date(`${props.value}T00:00:00`) : props.value,
)

const text = computed(() => {
  const date = d(valueToDisplay.value, props.type)
  if (!props.withTime) {
    return date
  }
  const time = new Date(props.value).toLocaleTimeString(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date} ${time}`
})
</script>

<template>
  <span>{{ text }}</span>
</template>
