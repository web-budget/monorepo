<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{ value: number | null; zeroIfNull?: boolean; signed?: boolean }>(),
  { zeroIfNull: false, signed: false },
)

const { n } = useI18n()

const amount = computed(() => props.value ?? (props.zeroIfNull ? 0 : null))
const direction = computed(() => {
  if (!props.signed || !amount.value) return null
  return amount.value > 0 ? 'income' : 'expense'
})

function format(value: number) {
  if (direction.value === null) return n(value, 'currency')
  const sign = direction.value === 'income' ? '+' : '−'
  return `${sign} ${n(Math.abs(value), 'currency')}`
}
</script>

<template>
  <span
    v-if="amount !== null"
    data-slot="currency"
    :data-direction="direction ?? undefined"
    :class="[
      'font-mono tabular-nums',
      direction === 'income' && 'text-income',
      direction === 'expense' && 'text-expense',
    ]"
    >{{ format(amount) }}</span
  >
</template>
