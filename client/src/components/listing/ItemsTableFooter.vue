<script setup lang="ts">
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'
import { computed } from 'vue'
import {
  MINIMUM_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type ItemsTablePageEvent,
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

const props = defineProps<{
  totalElements: number
  pageSize: number
  currentPage: number
  summary?: string
  noun?: string
}>()

const emit = defineEmits<{ pageChanged: [event: ItemsTablePageEvent] }>()

const firstRecord = computed(() =>
  props.totalElements === 0 ? 0 : props.currentPage * props.pageSize + 1,
)
const lastRecord = computed(() =>
  Math.min((props.currentPage + 1) * props.pageSize, props.totalElements),
)
const showPageSize = computed(() => props.totalElements > MINIMUM_PAGE_SIZE)

function changePage(page: number) {
  emit('pageChanged', { currentPage: page - 1, pageSize: props.pageSize })
}

function changePageSize(value: unknown) {
  emit('pageChanged', { currentPage: 0, pageSize: Number(value) })
}
</script>

<template>
  <div class="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
    <span class="font-mono tabular-nums">
      {{
        props.summary ??
        $t(props.noun ? 'items-table.footer.range-noun' : 'items-table.footer.range', {
          first: firstRecord,
          last: lastRecord,
          total: props.totalElements,
          noun: props.noun,
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
</template>
