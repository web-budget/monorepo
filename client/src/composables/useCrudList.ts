import { computed, onMounted, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ListStateKind } from '@/components/listing/ListState.vue'
import type {
  ItemsTableItem,
  ItemsTablePageEvent,
  ItemsTableRowEvent,
  ItemsTableSortEvent,
} from '@/components/listing/itemsTable'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import type { PageRequest } from '@/utils/pageRequest'

interface ListedRow {
  id: string
  name: string
}

interface CrudListOptions<S extends string> {
  routeName: string
  entity: string
  initialStatus: S
  pageRequest: Ref<
    Pick<PageRequest<S>, 'size' | 'current' | 'sortField' | 'direction' | 'status' | 'filterText'>
  >
  pageResponse: Ref<{ content: ListedRow[]; totalElements: number }>
  loading: Ref<boolean>
  findAll: () => Promise<void>
  remove: (id: string) => Promise<void>
  count?: (status: S) => Promise<number | null>
  statuses?: S[]
  allStatus?: S
}

export function useCrudList<S extends string>(options: CrudListOptions<S>) {
  const router = useRouter()
  const { confirmRemoval } = useConfirmDialog()
  const { showSuccess } = useNotification()
  const actionErrors = useServerErrors()
  const loadErrors = useServerErrors()
  const allStatus = options.allStatus ?? ('ALL' as S)

  const loadFailed = ref(false)
  const initializing = ref(true)
  const busy = computed(() => options.loading.value || initializing.value)
  const counts = ref<Partial<Record<S, number | null>>>({})

  const listState = computed<ListStateKind | 'table'>(() => {
    if (loadFailed.value) {
      return 'error'
    }
    const { totalElements } = options.pageResponse.value
    if (busy.value || totalElements > 0) {
      return 'table'
    }
    const request = options.pageRequest.value
    const registered = counts.value[allStatus]
    const nothingRegistered =
      registered === undefined || registered === null
        ? request.status === options.initialStatus || request.status === allStatus
        : registered === 0
    return request.filterText === '' && nothingRegistered ? 'empty' : 'no-result'
  })

  async function reload() {
    loadFailed.value = !(await loadErrors.run(options.findAll))
    initializing.value = false
  }

  async function loadCounts() {
    const count = options.count
    if (!count || !options.statuses) {
      return
    }
    const entries = await Promise.all(
      options.statuses.map(async (status) => [status, await count(status)] as const),
    )
    counts.value = Object.fromEntries(entries)
  }

  function search() {
    options.pageRequest.value.current = 0
    return reload()
  }

  function onPageChange(event: ItemsTablePageEvent) {
    options.pageRequest.value.size = event.pageSize
    options.pageRequest.value.current = event.currentPage
    return reload()
  }

  function onTableSorted(event: ItemsTableSortEvent) {
    options.pageRequest.value.sortField = event.sortField
    options.pageRequest.value.direction = event.sortOrder
    return reload()
  }

  function clearSearch() {
    const request = options.pageRequest.value
    if (request.filterText === '') {
      request.status = allStatus
    }
    request.filterText = ''
    return search()
  }

  function changeToAdd() {
    return router.push({ name: `${options.routeName}.create` })
  }

  function changeToUpdate(id: string) {
    return router.push({ name: `${options.routeName}.update`, params: { id } })
  }

  function changeToDetail({ data }: ItemsTableRowEvent<ItemsTableItem>) {
    return router.push({ name: `${options.routeName}.detail`, params: { id: data.id } })
  }

  async function remove(row: ListedRow) {
    if (!(await confirmRemoval(options.entity, row.name))) {
      return
    }
    if (await actionErrors.run(() => options.remove(row.id))) {
      showSuccess(
        `${options.entity}.toast.removed`,
        `${options.entity}.toast.removed-detail`,
        true,
        { name: row.name },
      )
      void loadCounts()
    }
  }

  onMounted(async () => {
    await reload()
    void loadCounts()
  })

  return {
    messages: actionErrors.messages,
    loadMessages: loadErrors.messages,
    listState,
    busy,
    counts,
    reload,
    search,
    clearSearch,
    onPageChange,
    onTableSorted,
    changeToAdd,
    changeToUpdate,
    changeToDetail,
    remove,
  }
}
