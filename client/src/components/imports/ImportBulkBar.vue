<script setup lang="ts">
import { Check, X } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import { Button } from '@/components/ui/button'
import type { ClassificationListView, CostCenterListView, ImportAction } from '@/types'

const props = defineProps<{
  count: number
  actions: ImportAction[]
  costCenters: CostCenterListView[]
  classifications: ClassificationListView[]
  busy: boolean
}>()

const emit = defineEmits<{
  apply: [change: { action?: ImportAction; costCenter?: string; classification?: string }]
  clear: []
}>()

const { t } = useI18n()

const action = ref('')
const costCenter = ref('')
const classification = ref('')

const actionOptions = computed(() =>
  props.actions.map((value) => ({ value, label: t(`imports.draft.actions.${value}`) })),
)
const costCenterOptions = computed(() =>
  props.costCenters.map((item) => ({ value: item.id, label: item.name })),
)
const classificationOptions = computed(() =>
  props.classifications.map((item) => ({ value: item.id, label: item.name })),
)
const changing = computed(() => action.value !== '' || costCenter.value !== '' || classification.value !== '')

function apply() {
  emit('apply', {
    action: (action.value || undefined) as ImportAction | undefined,
    costCenter: costCenter.value || undefined,
    classification: classification.value || undefined,
  })
  reset()
}

function reset() {
  action.value = ''
  costCenter.value = ''
  classification.value = ''
}

function clear() {
  reset()
  emit('clear')
}
</script>

<template>
  <div
    class="border-border flex flex-wrap items-end gap-3 border-t pt-4"
    role="group"
    :aria-label="$t('imports.draft.bulk.label')"
    data-slot="bulk-bar"
  >
    <span class="flex h-9 items-center text-sm font-medium">
      {{ $t('imports.draft.bulk.selected', count) }}
    </span>
    <FilterSelect
      v-model="action"
      class="w-full md:w-44"
      :label="$t('imports.draft.bulk.action')"
      :none-label="$t('imports.draft.bulk.keep')"
      :options="actionOptions"
    />
    <FilterSelect
      v-model="costCenter"
      class="w-full md:w-44"
      :label="$t('imports.draft.fields.cost-center')"
      :none-label="$t('imports.draft.bulk.keep')"
      :options="costCenterOptions"
    />
    <FilterSelect
      v-model="classification"
      class="w-full md:w-52"
      :label="$t('imports.draft.fields.classification')"
      :none-label="$t('imports.draft.bulk.keep')"
      :options="classificationOptions"
    />
    <Button type="button" :disabled="!changing || busy" @click="apply()">
      <Check />{{ $t('imports.draft.bulk.apply') }}
    </Button>
    <Button type="button" variant="ghost" @click="clear()">
      <X />{{ $t('imports.draft.bulk.clear') }}
    </Button>
  </div>
</template>
