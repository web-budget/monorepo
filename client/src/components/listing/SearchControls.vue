<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface StatusOption {
  label: string
  value: string
}

const props = withDefaults(
  defineProps<{
    filter: string
    status: string
    placeholder?: string
    statusOptions?: StatusOption[]
    statusInitialValue?: string
  }>(),
  {
    placeholder: '',
    statusOptions: () => [
      { label: 'search-control.all', value: 'ALL' },
      { label: 'search-control.inactive', value: 'INACTIVE' },
      { label: 'search-control.active', value: 'ACTIVE' },
    ],
    statusInitialValue: 'ACTIVE',
  },
)

const emit = defineEmits<{
  'update:status': [status: string]
  'update:filter': [filter: string]
  onFilterChange: []
  onFilterReset: []
  onNew: []
}>()

const statusValue = ref(props.status)
const filterValue = ref(props.filter)

function selectStatus(status: string) {
  statusValue.value = status
  fireFilterChange()
}

function updateFilter(value: string | number) {
  filterValue.value = String(value)
  emit('update:filter', filterValue.value)
}

function fireFilterChange() {
  emit('update:status', statusValue.value)
  emit('onFilterChange')
}

function resetFilter() {
  statusValue.value = props.statusInitialValue
  filterValue.value = ''
  emit('update:status', statusValue.value)
  emit('update:filter', filterValue.value)
  emit('onFilterReset')
}
</script>

<template>
  <div class="flex w-full flex-col gap-4 md:flex-row md:items-center">
    <div class="inline-flex rounded-md border" role="group">
      <Button
        v-for="option in props.statusOptions"
        :key="option.value"
        type="button"
        size="sm"
        class="rounded-none first:rounded-l-md last:rounded-r-md"
        :variant="statusValue === option.value ? 'default' : 'ghost'"
        :aria-pressed="statusValue === option.value"
        @click="selectStatus(option.value)"
      >
        {{ $t(option.label) }}
      </Button>
    </div>
    <div class="flex flex-1 gap-2">
      <Input
        :model-value="filterValue"
        :placeholder="props.placeholder"
        @update:model-value="updateFilter"
        @keydown.enter.prevent="fireFilterChange()"
      />
      <Button
        type="button"
        variant="destructive"
        size="icon"
        :aria-label="$t('search-control.actions.clear')"
        @click="resetFilter()"
      >
        <X />
      </Button>
    </div>
    <Button type="button" class="md:w-32" @click="fireFilterChange()">
      {{ $t('search-control.actions.search') }}
    </Button>
    <Button type="button" class="md:w-32" @click="emit('onNew')">
      {{ $t('search-control.actions.new') }}
    </Button>
  </div>
</template>
