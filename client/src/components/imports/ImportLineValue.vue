<script setup lang="ts">
import { ArrowDownLeft, ArrowUpRight } from 'lucide-vue-next'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import { computed } from 'vue'
import { isIncoming } from '@/utils/imports'

const props = defineProps<{ value: number; bare?: boolean }>()

const incoming = computed(() => isIncoming(props))
</script>

<template>
  <span
    class="inline-flex items-center gap-1"
    :title="$t(incoming ? 'imports.draft.incoming' : 'imports.draft.outgoing')"
    data-slot="line-value"
    :data-direction="incoming ? 'in' : 'out'"
  >
    <component
      :is="incoming ? ArrowDownLeft : ArrowUpRight"
      :class="['size-3.5', incoming ? 'text-income' : 'text-expense']"
    />
    <CurrencyDisplay
      :value="Math.abs(value)"
      :tone="incoming ? 'income' : 'expense'"
      :bare="bare"
    />
  </span>
</template>
