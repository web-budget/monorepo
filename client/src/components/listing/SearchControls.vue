<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import StatusTabs from '@/components/listing/StatusTabs.vue'
import { MASCULINE_STATUS_OPTIONS, type StatusOption } from '@/components/listing/statusOptions'
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
  <div class="flex flex-wrap items-center justify-between gap-3">
    <form
      role="search"
      class="flex w-full max-w-2xl min-w-0 flex-1 items-center"
      @submit.prevent="searchNow()"
    >
      <div
        class="border-input bg-card focus-within:border-ring focus-within:ring-ring/40 flex h-10 min-w-0 flex-1 items-center overflow-hidden rounded-md border transition-[border-color,box-shadow] duration-150 focus-within:ring-[3px]"
      >
        <Input
          type="search"
          class="h-full flex-1 rounded-none border-0 bg-transparent text-[15px] focus-visible:ring-0 md:text-[15px] [&::-webkit-search-cancel-button]:hidden"
          :model-value="filterValue"
          :placeholder="props.placeholder"
          :aria-label="$t('search-control.field')"
          @update:model-value="updateFilter"
          @keydown.enter.prevent="searchNow()"
        />
        <button
          v-if="filterValue"
          type="button"
          class="text-muted-foreground hover:text-foreground mr-1 rounded-sm p-1"
          :aria-label="$t('search-control.actions.clear')"
          @click="resetFilter()"
        >
          <X class="size-4" />
        </button>
        <button
          type="submit"
          class="border-input bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground flex h-full items-center border-l px-3.5"
          :aria-label="$t('search-control.actions.search')"
          :title="$t('search-control.actions.search')"
        >
          <Search class="size-4" />
        </button>
      </div>
    </form>
    <StatusTabs
      v-if="props.statusOptions.length > 0"
      :status="props.status"
      :options="props.statusOptions"
      :counts="props.counts"
      @select="selectStatus"
    />
  </div>
</template>
