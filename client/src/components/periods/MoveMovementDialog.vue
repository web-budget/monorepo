<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ClosingPeriodView } from '@/types'
import { formatLocalDate } from '@/utils/localDate'

interface MovableMovement {
  id: string
  name: string
}

const props = defineProps<{
  movement: MovableMovement | null
  targets: ClosingPeriodView[]
  suggested: ClosingPeriodView | null
  loading: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [movement: MovableMovement, financialPeriod: ClosingPeriodView]
}>()

const { t } = useI18n()

const chosen = ref('')

watch(
  () => props.movement,
  () => {
    chosen.value = props.suggested?.id ?? props.targets[0]?.id ?? ''
  },
)

const choices = computed(() =>
  props.targets.map((period) => ({
    value: period.id,
    label:
      period.endingAt < formatLocalDate(new Date())
        ? `${period.name} · ${t('period-closing.move.expired')}`
        : period.name,
  })),
)

function confirm() {
  const target = props.targets.find((period) => period.id === chosen.value)!
  emit('confirm', props.movement as MovableMovement, target)
}
</script>

<template>
  <Dialog :open="movement !== null" @update:open="emit('close')">
    <DialogContent class="sm:max-w-md">
      <div class="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{{ $t('period-closing.move.title', { name: movement?.name }) }}</DialogTitle>
          <DialogDescription class="sr-only">{{ movement?.name }}</DialogDescription>
        </DialogHeader>
        <FilterSelect
          :label="$t('period-closing.move.period')"
          :options="choices"
          :model-value="chosen"
          @update:model-value="(value: string) => (chosen = value)"
        />
        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="button" :disabled="loading || chosen === ''" @click="confirm()">
            <ArrowRight />{{ $t('period-closing.move.confirm') }}
          </Button>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
