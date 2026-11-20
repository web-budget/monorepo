<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { MASCULINE_STATUS_OPTIONS, type StatusOption } from '@/components/listing/statusOptions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

function updateFilter(value: string | number) {
  filterValue.value = String(value)
  emit('update:filter', filterValue.value)
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
    <div class="flex w-full gap-2 md:w-auto">
      <div class="relative min-w-0 flex-1 md:w-80 md:flex-none">
        <Input
          type="search"
          class="pr-9 [&::-webkit-search-cancel-button]:hidden"
          :model-value="filterValue"
          :placeholder="props.placeholder"
          :aria-label="$t('search-control.field')"
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
      <Button type="button" variant="outline" @click="searchNow()">
        <Search />{{ $t('search-control.actions.search') }}
      </Button>
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
