<script setup lang="ts">
import { computed } from 'vue'
import type { RecurringMovementView } from '@/types'
import { installmentProgress } from '@/utils/recurringMovements'

const props = defineProps<{
  recurringMovement: Pick<RecurringMovementView, 'installments' | 'launchedInstallments'>
}>()

const progress = computed(() => installmentProgress(props.recurringMovement))
</script>

<template>
  <span v-if="progress" class="inline-flex flex-col gap-1" data-slot="installments">
    <span class="font-mono tabular-nums">{{ progress.current }}/{{ progress.total }}</span>
    <span class="bg-secondary h-1 w-20 overflow-hidden rounded-full" aria-hidden="true">
      <span
        class="bg-primary block h-full"
        data-slot="installments-bar"
        :style="{ width: `${progress.percentage}%` }"
      />
    </span>
  </span>
  <span v-else class="text-muted-foreground" data-slot="installments">
    {{ $t('recurrent-movement.installments.indefinite') }}
  </span>
</template>
