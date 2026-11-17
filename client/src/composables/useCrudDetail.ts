import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'

interface CrudDetailOptions {
  routeName: string
  deletedNotice: string
  id: () => string
  findOne: (id: string) => Promise<unknown>
  remove: (id: string) => Promise<void>
}

export function useCrudDetail(options: CrudDetailOptions) {
  const router = useRouter()
  const { confirmDelete } = useConfirmDialog()
  const { showSuccess } = useNotification()
  const { messages, run } = useServerErrors()

  function changeToList() {
    return router.push({ name: options.routeName })
  }

  function changeToUpdate() {
    return router.push({ name: `${options.routeName}.update`, params: { id: options.id() } })
  }

  async function remove() {
    if (!(await confirmDelete())) {
      return
    }
    if (await run(() => options.remove(options.id()))) {
      showSuccess('notification.record-deleted', options.deletedNotice)
      await changeToList()
    }
  }

  onMounted(() => run(() => options.findOne(options.id())))

  return { messages, changeToList, changeToUpdate, remove }
}
