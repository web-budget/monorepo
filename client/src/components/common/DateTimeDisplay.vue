<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{ value: string; type?: 'short' | 'long'; fixTime?: boolean }>(),
  { type: 'short', fixTime: false },
)

const { d } = useI18n()

const valueToDisplay = computed(() =>
  props.fixTime ? new Date(`${props.value}T00:00:00`) : props.value,
)
</script>

<template>
  <span>{{ d(valueToDisplay, props.type) }}</span>
</template>
