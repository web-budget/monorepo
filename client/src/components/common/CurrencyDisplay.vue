<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    value: number | null
    zeroIfNull?: boolean
    signed?: boolean
    bare?: boolean
    glued?: boolean
    tone?: 'income' | 'expense'
  }>(),
  { zeroIfNull: false, signed: false, bare: false, glued: false },
)

const { n } = useI18n()

const amount = computed(() => props.value ?? (props.zeroIfNull ? 0 : null))

const negative = computed(() => props.signed && Number(amount.value) < 0)

const color = computed(() => (negative.value ? 'expense' : (props.tone ?? null)))

function plain(value: number) {
  const formatted = n(value, 'currency')
  return props.bare ? formatted.replace(/^R\$\s*/, '') : formatted
}

function format(value: number) {
  if (!negative.value) return plain(value)
  return `−${props.glued ? '' : ' '}${plain(Math.abs(value))}`
}
</script>

<template>
  <span
    v-if="amount !== null"
    data-slot="currency"
    :data-direction="color ?? undefined"
    :class="[
      'font-mono tabular-nums',
      color === 'income' && 'text-income',
      color === 'expense' && 'text-expense',
    ]"
    >{{ format(amount) }}</span
  >
</template>
