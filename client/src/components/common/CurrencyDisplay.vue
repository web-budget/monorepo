<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    value: number | null
    zeroIfNull?: boolean
    signed?: boolean
    sign?: 'income' | 'expense'
    bare?: boolean
    glued?: boolean
    neutral?: boolean
  }>(),
  { zeroIfNull: false, signed: false, bare: false, glued: false, neutral: false },
)

const { n } = useI18n()

const amount = computed(() => props.value ?? (props.zeroIfNull ? 0 : null))

const direction = computed(() => {
  if (props.sign) return props.sign
  if (!props.signed || !amount.value) return null
  return amount.value > 0 ? 'income' : 'expense'
})

function plain(value: number) {
  const formatted = n(value, 'currency')
  return props.bare ? formatted.replace(/^R\$\s*/, '') : formatted
}

function format(value: number) {
  if (direction.value === null) return plain(value)
  const sign = direction.value === 'income' ? '+' : '−'
  return `${sign}${props.glued ? '' : ' '}${plain(Math.abs(value))}`
}
</script>

<template>
  <span
    v-if="amount !== null"
    data-slot="currency"
    :data-direction="direction ?? undefined"
    :class="[
      'font-mono tabular-nums',
      !neutral && direction === 'income' && 'text-income',
      !neutral && direction === 'expense' && 'text-expense',
    ]"
    >{{ format(amount) }}</span
  >
</template>
