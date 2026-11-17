import { onMounted, type Ref } from 'vue'
import { useRouter } from 'vue-router'
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

interface CrudListOptions {
  routeName: string
  deletedNotice: string
  pageRequest: Ref<Pick<PageRequest, 'size' | 'current' | 'sortField' | 'direction'>>
  findAll: () => Promise<void>
  remove: (id: string) => Promise<void>
}

export function useCrudList(options: CrudListOptions) {
  const router = useRouter()
  const { confirmDelete } = useConfirmDialog()
  const { showSuccess } = useNotification()
  const { messages, run } = useServerErrors()

  function reload() {
    return run(options.findAll)
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

  function changeToAdd() {
    return router.push({ name: `${options.routeName}.create` })
  }

  function changeToUpdate(id: string) {
    return router.push({ name: `${options.routeName}.update`, params: { id } })
  }

  function changeToDetail({ data }: ItemsTableRowEvent<ItemsTableItem>) {
    return router.push({ name: `${options.routeName}.detail`, params: { id: data.id } })
  }

  async function remove(id: string) {
    if (!(await confirmDelete())) {
      return
    }
    if (await run(() => options.remove(id))) {
      showSuccess('notification.record-deleted', options.deletedNotice)
    }
  }

  onMounted(reload)

  return {
    messages,
    reload,
    onPageChange,
    onTableSorted,
    changeToAdd,
    changeToUpdate,
    changeToDetail,
    remove,
  }
}
