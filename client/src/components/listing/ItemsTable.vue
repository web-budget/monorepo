<script setup lang="ts" generic="T extends ItemsTableItem">
import { useMediaQuery } from '@vueuse/core'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-vue-next'
import { computed, ref, useSlots, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import StatusBadge from '@/components/listing/StatusBadge.vue'
import ItemsTableFooter from '@/components/listing/ItemsTableFooter.vue'
import type {
  ItemsTableColumn,
  ItemsTableItem,
  ItemsTablePageEvent,
  ItemsTableRowEvent,
  ItemsTableSortEvent,
} from '@/components/listing/itemsTable'
import { Card } from '@/components/ui/card'
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
    sortedField?: string
    sortedOrder?: 'asc' | 'desc'
    noun?: string
    defaultSortField?: string
    activeSortIconOnly?: boolean
    hideFooter?: boolean
    statusSortable?: boolean
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
    sortedField: undefined,
    sortedOrder: undefined,
    noun: undefined,
    defaultSortField: DEFAULT_SORT_FIELD,
    activeSortIconOnly: false,
    hideFooter: false,
    statusSortable: true,
  },
)

const emit = defineEmits<{
  pageChanged: [event: ItemsTablePageEvent]
  rowSelected: [event: ItemsTableRowEvent<T>]
  tableSorted: [event: ItemsTableSortEvent]
}>()

defineSlots<{
  actions?(props: { item: T }): unknown
  [slot: `cell-${string}`]:
    ((props: { item: T; value: unknown; compact?: boolean }) => unknown) | undefined
}>()

const { t } = useI18n()
const slots = useSlots()
const compact = useMediaQuery('(max-width: 767px)')

const sortField = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc' | null>(null)

watch(
  () => [props.sortedField, props.sortedOrder],
  () => {
    if (props.sortedField === undefined) {
      return
    }
    const isDefault =
      !props.activeSortIconOnly &&
      props.sortedField === DEFAULT_SORT_FIELD &&
      props.sortedOrder === DEFAULT_SORT_DIRECTION
    sortField.value = isDefault ? null : props.sortedField
    sortDirection.value = isDefault ? null : (props.sortedOrder ?? DEFAULT_SORT_DIRECTION)
  },
  { immediate: true },
)

const hasCustomDefaultSort = computed(() => props.defaultSortField !== DEFAULT_SORT_FIELD)
const hasActions = computed(() => slots.actions !== undefined)
const columnCount = computed(
  () => props.columns.length + (props.showStatus ? 1 : 0) + (hasActions.value ? 1 : 0),
)
const linkedField = computed(() => props.linkField ?? props.columns[0]?.field ?? '')
const compactCards = computed(() => props.columns.some((column) => column.mobile !== undefined))
const titleColumn = computed(
  () => props.columns.find((column) => column.mobile === 'title')?.field ?? linkedField.value,
)
const valueColumn = computed(() => props.columns.find((column) => column.mobile === 'value'))
const lineColumns = computed(() => props.columns.filter((column) => column.mobile === 'line'))
const secondaryColumns = computed(() =>
  props.columns.filter((column) => column.field !== linkedField.value),
)
const statusColumn = computed<ItemsTableColumn>(() => ({
  field: 'active',
  header: t('crud.status'),
  sortable: props.statusSortable,
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
  } else if (hasCustomDefaultSort.value) {
    sortDirection.value = 'asc'
  } else {
    sortField.value = null
    sortDirection.value = null
  }
  emit('tableSorted', {
    sortField: sortField.value ?? DEFAULT_SORT_FIELD,
    sortOrder: sortDirection.value ?? DEFAULT_SORT_DIRECTION,
  })
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
                  v-if="!activeSortIconOnly || sortField === column.field"
                  :class="['size-3', sortField !== column.field && 'opacity-40']"
                />
              </button>
              <span v-else-if="column.srOnly" class="sr-only">{{ column.header }}</span>
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

    <Card
      v-else-if="compactCards"
      class="gap-0 overflow-hidden py-0"
      data-slot="items-cards"
      data-layout="compact"
    >
      <template v-if="props.loading && props.data.length === 0">
        <div
          v-for="row in 3"
          :key="row"
          class="grid gap-2 border-b px-3.5 py-3 last:border-b-0"
          :aria-label="$t('items-table.state.loading')"
        >
          <Skeleton class="h-4 w-40" />
          <Skeleton class="h-3.5 w-24" />
        </div>
      </template>
      <div
        v-for="(item, index) in props.data"
        v-else
        :key="item.id"
        :class="
          cn(
            'grid cursor-pointer gap-1.5 border-b px-3.5 py-3 last:border-b-0',
            isMarked(item) && 'shadow-[inset_3px_0_0_var(--highlight)]',
          )
        "
        @click="emit('rowSelected', { data: item, index })"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 font-medium">
            <RouterLink v-if="props.detailRoute !== undefined" :to="detailTarget(item)" @click.stop>
              <slot
                :name="`cell-${titleColumn}`"
                :compact="true"
                :item="item"
                :value="cellValue(item, titleColumn)"
              >
                {{ cellValue(item, titleColumn) }}
              </slot>
            </RouterLink>
            <slot
              v-else
              :name="`cell-${titleColumn}`"
              :compact="true"
              :item="item"
              :value="cellValue(item, titleColumn)"
            >
              {{ cellValue(item, titleColumn) }}
            </slot>
          </div>
          <div class="flex shrink-0 items-center gap-1" @click.stop>
            <slot
              v-if="valueColumn"
              :name="`cell-${valueColumn.field}`"
              :item="item"
              :value="cellValue(item, valueColumn.field)"
            >
              {{ cellValue(item, valueColumn.field) }}
            </slot>
            <slot name="actions" :item="item" />
          </div>
        </div>
        <div
          v-if="lineColumns.length > 0"
          class="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
        >
          <span v-for="column in lineColumns" :key="column.field">
            <template v-if="column.mobileLabel !== false">{{ column.header }}: </template>
            <slot
              :name="`cell-${column.field}`"
              :item="item"
              :value="cellValue(item, column.field)"
            >
              {{ cellValue(item, column.field) }}
            </slot>
          </span>
        </div>
      </div>
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

    <ItemsTableFooter
      v-if="!props.hideFooter"
      :total-elements="props.totalElements"
      :page-size="props.pageSize"
      :current-page="props.currentPage"
      :summary="props.summary"
      :noun="props.noun"
      @page-changed="emit('pageChanged', $event)"
    />
  </div>
</template>
