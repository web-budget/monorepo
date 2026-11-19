<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { Search, X } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { MASCULINE_STATUS_OPTIONS, type StatusOption } from '@/components/listing/statusOptions'
import { Input } from '@/components/ui/input'

const SEARCH_DELAY = 300

const props = withDefaults(
  defineProps<{
    filter: string
    status: string
    placeholder?: string
    statusOptions?: StatusOption[]
    counts?: Record<string, number | null | undefined>
  }>(),
  {
    placeholder: '',
    statusOptions: () => MASCULINE_STATUS_OPTIONS,
    counts: () => ({}),
  },
)

const emit = defineEmits<{
  'update:status': [status: string]
  'update:filter': [filter: string]
  onFilterChange: []
  onFilterReset: []
}>()

const filterValue = ref(props.filter)

watch(
  () => props.filter,
  (filter) => {
    filterValue.value = filter
  },
)

const fireFilterChange = useDebounceFn(() => emit('onFilterChange'), SEARCH_DELAY)

function updateFilter(value: string | number) {
  filterValue.value = String(value)
  emit('update:filter', filterValue.value)
  void fireFilterChange()
}

function searchNow() {
  emit('onFilterChange')
}

function selectStatus(status: string) {
  emit('update:status', status)
  emit('onFilterChange')
}

function resetFilter() {
  filterValue.value = ''
  emit('update:filter', '')
  emit('onFilterReset')
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="relative w-full md:w-80">
      <Search
        class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
      />
      <Input
        type="search"
        class="px-9 [&::-webkit-search-cancel-button]:hidden"
        :model-value="filterValue"
        :placeholder="props.placeholder"
        :aria-label="$t('search-control.actions.search')"
        @update:model-value="updateFilter"
        @keydown.enter.prevent="searchNow()"
      />
      <button
        v-if="filterValue"
        type="button"
        class="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1"
        :aria-label="$t('search-control.actions.clear')"
        @click="resetFilter()"
      >
        <X class="size-4" />
      </button>
    </div>
    <div
      class="bg-muted inline-flex h-9 items-center gap-0.5 rounded-md p-1 max-md:w-full max-md:overflow-x-auto max-md:[scrollbar-width:none]"
      role="group"
      :aria-label="$t('search-control.status')"
    >
      <button
        v-for="option in props.statusOptions"
        :key="option.value"
        type="button"
        :aria-pressed="props.status === option.value"
        class="text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs inline-flex h-7 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium transition-colors max-md:flex-1 max-md:gap-1 max-md:px-1.5 max-md:text-[13px]"
        @click="selectStatus(option.value)"
      >
        {{ $t(option.label) }}
        <span
          v-if="props.counts[option.value] != null"
          class="font-mono text-xs tabular-nums"
          data-slot="status-count"
        >
          {{ props.counts[option.value] }}
        </span>
      </button>
    </div>
  </div>
</template>
