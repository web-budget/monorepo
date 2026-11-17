<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{ value: number | null; zeroIfNull?: boolean }>(), {
  zeroIfNull: false,
})

const { n } = useI18n()

const amount = computed(() => props.value ?? (props.zeroIfNull ? 0 : null))
</script>

<template>
  <span v-if="amount !== null">{{ n(amount, 'currency') }}</span>
</template>
