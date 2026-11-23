import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { isPublicRoute } from '@/router/publicRoutes'

export function useDiscardGuard(isDirty: () => boolean, recordName: () => string) {
  const router = useRouter()
  const { confirmDiscard } = useConfirmDialog()
  const saved = ref(false)

  const removeGuard = router.beforeEach((to) => {
    if (saved.value || !isDirty() || isPublicRoute(to)) {
      return true
    }
    return confirmDiscard(recordName())
  })

  onBeforeUnmount(removeGuard)

  return { saved }
}
