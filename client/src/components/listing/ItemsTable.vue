<script setup lang="ts" generic="T extends ItemsTableItem">
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-vue-next'
import { computed, ref, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import StatusBadge from '@/components/listing/StatusBadge.vue'
import {
  DEFAULT_SORT_FIELD,
  PAGE_SIZE_OPTIONS,
  type ItemsTableColumn,
  type ItemsTableItem,
  type ItemsTablePageEvent,
  type ItemsTableRowEvent,
  type ItemsTableSortEvent,
} from '@/components/listing/itemsTable'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    data: T[]
    totalElements: number
    columns?: ItemsTableColumn[]
    showStatus?: boolean
    pageSize?: number
    currentPage?: number
    loading?: boolean
  }>(),
  { columns: () => [], showStatus: true, pageSize: 15, currentPage: 0, loading: false },
)

const emit = defineEmits<{
  pageChanged: [event: ItemsTablePageEvent]
  rowSelected: [event: ItemsTableRowEvent<T>]
  tableSorted: [event: ItemsTableSortEvent]
}>()

defineSlots<{
  actions?(props: { item: T }): unknown
  [slot: `cell-${string}`]: ((props: { item: T; value: unknown }) => unknown) | undefined
}>()

const { t } = useI18n()
const slots = useSlots()

const sortField = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc' | null>(null)

const hasActions = computed(() => slots.actions !== undefined)
const columnCount = computed(
  () => props.columns.length + (props.showStatus ? 1 : 0) + (hasActions.value ? 1 : 0),
)
const firstRecord = computed(() =>
  props.totalElements === 0 ? 0 : props.currentPage * props.pageSize + 1,
)
const lastRecord = computed(() =>
  Math.min((props.currentPage + 1) * props.pageSize, props.totalElements),
)
const headerColumns = computed<ItemsTableColumn[]>(() => [
  ...(props.showStatus
    ? [{ field: 'active', header: t('items-table.columns.status'), sortable: true }]
    : []),
  ...props.columns,
])

function cellValue(item: T, field: string): unknown {
  return (item as Record<string, unknown>)[field]
}

function sortIcon(field: string) {
  if (sortField.value !== field) {
    return ArrowUpDown
  }
  return sortDirection.value === 'asc' ? ArrowUp : ArrowDown
}

function ariaSort(field: string) {
  if (sortField.value !== field) {
    return 'none'
  }
  return sortDirection.value === 'asc' ? 'ascending' : 'descending'
}

function toggleSort(field: string) {
  if (sortField.value !== field) {
    sortField.value = field
    sortDirection.value = 'asc'
  } else if (sortDirection.value === 'asc') {
    sortDirection.value = 'desc'
  } else {
    sortField.value = null
    sortDirection.value = null
  }
  emit('tableSorted', {
    sortField: sortField.value ?? DEFAULT_SORT_FIELD,
    sortOrder: sortDirection.value ?? 'asc',
  })
}

function changePage(page: number) {
  emit('pageChanged', { currentPage: page - 1, pageSize: props.pageSize })
}

function changePageSize(value: unknown) {
  emit('pageChanged', { currentPage: 0, pageSize: Number(value) })
}
</script>

<template>
  <div class="space-y-4">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            v-for="column in headerColumns"
            :key="column.field"
            :aria-sort="ariaSort(column.field)"
            :class="column.field === 'active' ? 'w-[10%]' : undefined"
          >
            <button
              v-if="column.sortable"
              type="button"
              class="inline-flex items-center gap-1"
              @click="toggleSort(column.field)"
            >
              {{ column.header }}
              <component :is="sortIcon(column.field)" class="size-3.5" />
            </button>
            <template v-else>{{ column.header }}</template>
          </TableHead>
          <TableHead v-if="hasActions" class="w-[12%]">
            {{ $t('items-table.columns.actions') }}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody :class="{ 'opacity-60': props.loading && props.data.length > 0 }">
        <template v-if="props.loading && props.data.length === 0">
          <TableRow v-for="row in 3" :key="row" :aria-label="$t('items-table.state.loading')">
            <TableCell v-for="cell in columnCount" :key="cell">
              <Skeleton class="h-5 w-full" />
            </TableCell>
          </TableRow>
        </template>
        <TableEmpty v-else-if="props.data.length === 0" :colspan="columnCount">
          {{ $t('items-table.state.empty') }}
        </TableEmpty>
        <template v-else>
          <TableRow
            v-for="(item, index) in props.data"
            :key="item.id"
            class="cursor-pointer"
            @click="emit('rowSelected', { data: item, index })"
          >
            <TableCell v-if="props.showStatus">
              <StatusBadge :active="item.active === true" />
            </TableCell>
            <TableCell v-for="column in props.columns" :key="column.field" :class="column.class">
              <slot
                :name="`cell-${column.field}`"
                :item="item"
                :value="cellValue(item, column.field)"
              >
                {{ cellValue(item, column.field) }}
              </slot>
            </TableCell>
            <TableCell v-if="hasActions" @click.stop>
              <slot name="actions" :item="item" />
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>

    <div class="flex flex-col items-center justify-between gap-4 md:flex-row">
      <span class="text-muted-foreground text-sm">
        {{ firstRecord }}{{ $t('items-table.footer.until') }}{{ lastRecord
        }}{{ $t('items-table.footer.total') }}{{ props.totalElements }}
      </span>
      <Pagination
        :total="props.totalElements"
        :items-per-page="props.pageSize"
        :page="props.currentPage + 1"
        :sibling-count="1"
        show-edges
        class="mx-0 w-auto"
        @update:page="changePage"
      >
        <PaginationContent v-slot="{ items }">
          <PaginationFirst :aria-label="$t('items-table.pagination.first')">
            <ChevronsLeft />
          </PaginationFirst>
          <PaginationPrevious :aria-label="$t('items-table.pagination.previous')">
            <ChevronLeft />
          </PaginationPrevious>
          <template v-for="(page, index) in items" :key="index">
            <PaginationItem
              v-if="page.type === 'page'"
              :value="page.value"
              :is-active="page.value === props.currentPage + 1"
            >
              {{ page.value }}
            </PaginationItem>
            <PaginationEllipsis v-else :index="index" />
          </template>
          <PaginationNext :aria-label="$t('items-table.pagination.next')">
            <ChevronRight />
          </PaginationNext>
          <PaginationLast :aria-label="$t('items-table.pagination.last')">
            <ChevronsRight />
          </PaginationLast>
        </PaginationContent>
      </Pagination>
      <Select :model-value="String(props.pageSize)" @update:model-value="changePageSize">
        <SelectTrigger class="w-24" :aria-label="$t('items-table.pagination.rows-per-page')">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="size in PAGE_SIZE_OPTIONS" :key="size" :value="String(size)">
            {{ size }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>
