<script setup lang="ts" generic="T extends ItemsTableItem">
import { useMediaQuery } from '@vueuse/core'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-vue-next'
import { computed, ref, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import StatusBadge from '@/components/listing/StatusBadge.vue'
import {
  MINIMUM_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type ItemsTableColumn,
  type ItemsTableItem,
  type ItemsTablePageEvent,
  type ItemsTableRowEvent,
  type ItemsTableSortEvent,
} from '@/components/listing/itemsTable'
import { Card } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'
import { DEFAULT_SORT_DIRECTION, DEFAULT_SORT_FIELD } from '@/utils/pageRequest'

const props = withDefaults(
  defineProps<{
    data: T[]
    totalElements: number
    columns?: ItemsTableColumn[]
    showStatus?: boolean
    pageSize?: number
    currentPage?: number
    loading?: boolean
    detailRoute?: string
    linkField?: string
    markedRow?: (item: T) => boolean
    summary?: string
    feminineStatus?: boolean
  }>(),
  {
    columns: () => [],
    showStatus: true,
    pageSize: 15,
    currentPage: 0,
    loading: false,
    detailRoute: undefined,
    linkField: undefined,
    markedRow: undefined,
    summary: undefined,
    feminineStatus: false,
  },
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
const compact = useMediaQuery('(max-width: 767px)')

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
const showPageSize = computed(() => props.totalElements > MINIMUM_PAGE_SIZE)
const linkedField = computed(() => props.linkField ?? props.columns[0]?.field ?? '')
const secondaryColumns = computed(() =>
  props.columns.filter((column) => column.field !== linkedField.value),
)
const statusColumn = computed<ItemsTableColumn>(() => ({
  field: 'active',
  header: t('crud.status'),
  sortable: true,
}))

function isMarked(item: T): boolean {
  return props.markedRow?.(item) === true
}

function cellValue(item: T, field: string): unknown {
  return (item as Record<string, unknown>)[field]
}

function cellClass(column: ItemsTableColumn) {
  return cn(
    column.class,
    column.align === 'end' && 'text-right',
    column.mono && 'font-mono tabular-nums',
  )
}

function isLink(column: ItemsTableColumn) {
  return props.detailRoute !== undefined && column.field === linkedField.value
}

function detailTarget(item: T) {
  return { name: props.detailRoute, params: { id: item.id } }
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
    sortOrder: sortDirection.value ?? DEFAULT_SORT_DIRECTION,
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
  <div class="space-y-3">
    <Card v-if="!compact" class="gap-0 overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              v-for="column in [...props.columns, ...(props.showStatus ? [statusColumn] : [])]"
              :key="column.field"
              :aria-sort="ariaSort(column.field)"
              :class="
                cn(column.align === 'end' && 'text-right', column.field === 'active' && 'w-[10%]')
              "
            >
              <button
                v-if="column.sortable"
                type="button"
                :class="[
                  'inline-flex items-center gap-1 uppercase',
                  sortField === column.field && 'text-foreground',
                ]"
                @click="toggleSort(column.field)"
              >
                {{ column.header }}
                <component
                  :is="sortIcon(column.field)"
                  :class="['size-3', sortField !== column.field && 'opacity-40']"
                />
              </button>
              <template v-else>{{ column.header }}</template>
            </TableHead>
            <TableHead v-if="hasActions" class="w-0">
              <span class="sr-only">{{ $t('items-table.columns.actions') }}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody :class="{ 'opacity-60': props.loading && props.data.length > 0 }">
          <template v-if="props.loading && props.data.length === 0">
            <TableRow v-for="row in 3" :key="row" :aria-label="$t('items-table.state.loading')">
              <TableCell v-for="cell in columnCount" :key="cell">
                <Skeleton class="h-3.5 w-full max-w-32" />
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
              :data-state="isMarked(item) ? 'selected' : undefined"
              @click="emit('rowSelected', { data: item, index })"
            >
              <TableCell
                v-for="column in props.columns"
                :key="column.field"
                :class="cellClass(column)"
              >
                <RouterLink
                  v-if="isLink(column)"
                  :to="detailTarget(item)"
                  class="font-medium hover:underline"
                  @click.stop
                >
                  <slot
                    :name="`cell-${column.field}`"
                    :item="item"
                    :value="cellValue(item, column.field)"
                  >
                    {{ cellValue(item, column.field) }}
                  </slot>
                </RouterLink>
                <slot
                  v-else
                  :name="`cell-${column.field}`"
                  :item="item"
                  :value="cellValue(item, column.field)"
                >
                  {{ cellValue(item, column.field) }}
                </slot>
              </TableCell>
              <TableCell v-if="props.showStatus">
                <StatusBadge :active="item.active === true" :feminine="props.feminineStatus" />
              </TableCell>
              <TableCell v-if="hasActions" class="text-right" @click.stop>
                <slot name="actions" :item="item" />
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </Card>

    <div v-else class="grid gap-2" data-slot="items-cards">
      <template v-if="props.loading && props.data.length === 0">
        <Card
          v-for="row in 3"
          :key="row"
          class="gap-2 p-4"
          :aria-label="$t('items-table.state.loading')"
        >
          <Skeleton class="h-4 w-40" />
          <Skeleton class="h-3.5 w-24" />
        </Card>
      </template>
      <Card
        v-for="(item, index) in props.data"
        v-else
        :key="item.id"
        :class="
          cn(
            'cursor-pointer gap-3 p-4',
            isMarked(item) && 'shadow-[inset_3px_0_0_var(--highlight)]',
          )
        "
        @click="emit('rowSelected', { data: item, index })"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="grid min-w-0 gap-1.5">
            <RouterLink
              v-if="props.detailRoute !== undefined"
              :to="detailTarget(item)"
              class="font-medium"
              @click.stop
            >
              <slot
                :name="`cell-${linkedField}`"
                :item="item"
                :value="cellValue(item, linkedField)"
              >
                {{ cellValue(item, linkedField) }}
              </slot>
            </RouterLink>
            <span v-else class="font-medium">
              <slot
                :name="`cell-${linkedField}`"
                :item="item"
                :value="cellValue(item, linkedField)"
              >
                {{ cellValue(item, linkedField) }}
              </slot>
            </span>
            <StatusBadge
              v-if="props.showStatus"
              :active="item.active === true"
              :feminine="props.feminineStatus"
              class="w-fit"
            />
          </div>
          <div v-if="hasActions" class="-mt-1 -mr-2" @click.stop>
            <slot name="actions" :item="item" />
          </div>
        </div>
        <dl v-if="secondaryColumns.length > 0" class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div
            v-for="column in secondaryColumns"
            :key="column.field"
            :class="cn('min-w-0', column.wide && 'col-span-2')"
          >
            <dt class="text-muted-foreground text-xs">{{ column.header }}</dt>
            <dd :class="cn(column.mono && 'font-mono tabular-nums')">
              <slot
                :name="`cell-${column.field}`"
                :item="item"
                :value="cellValue(item, column.field)"
              >
                {{ cellValue(item, column.field) }}
              </slot>
            </dd>
          </div>
        </dl>
      </Card>
    </div>

    <div class="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
      <span class="font-mono tabular-nums">
        {{
          props.summary ??
          $t('items-table.footer.range', {
            first: firstRecord,
            last: lastRecord,
            total: props.totalElements,
          })
        }}
      </span>
      <div class="flex items-center gap-2">
        <Select
          v-if="showPageSize"
          :model-value="String(props.pageSize)"
          @update:model-value="changePageSize"
        >
          <SelectTrigger
            size="sm"
            class="w-20"
            :aria-label="$t('items-table.pagination.rows-per-page')"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="size in PAGE_SIZE_OPTIONS" :key="size" :value="String(size)">
              {{ size }}
            </SelectItem>
          </SelectContent>
        </Select>
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
      </div>
    </div>
  </div>
</template>
