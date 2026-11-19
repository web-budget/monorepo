import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useUsersAdminStore } from '@/stores/usersAdmin'
import type { UserView } from '@/types'

export function useUserActions(onChanged: () => Promise<void> | void) {
  const { t } = useI18n()
  const store = useUsersAdminStore()
  const { confirm } = useConfirmDialog()
  const { showSuccess } = useNotification()
  const { messages, run } = useServerErrors()

  const approveTarget = ref<UserView | null>(null)

  async function apply(action: () => Promise<void>, toast: string, user: UserView) {
    if (await run(action)) {
      showSuccess(`users.toast.${toast}`, `users.toast.${toast}-detail`, true, { name: user.name })
      await onChanged()
    }
  }

  async function approve(user: UserView, roles: string[]) {
    approveTarget.value = null
    await apply(() => store.approve(user, roles), 'approved', user)
  }

  async function block(user: UserView) {
    const confirmed = await confirm({
      destructive: true,
      title: t('users.block.title', { name: user.name }),
      description: t('users.block.description'),
      confirmLabel: t('users.block.action'),
    })
    if (confirmed) {
      await apply(() => store.block(user.id), 'blocked', user)
    }
  }

  async function unblock(user: UserView) {
    const confirmed = await confirm({
      title: t('users.unblock.title', { name: user.name }),
      description: t('users.unblock.description'),
      confirmLabel: t('users.unblock.action'),
    })
    if (confirmed) {
      await apply(() => store.unblock(user.id), 'unblocked', user)
    }
  }

  async function resetTotp(user: UserView) {
    const confirmed = await confirm({
      destructive: true,
      title: t('users.totp-reset.title', { name: user.name }),
      description: t('users.totp-reset.description'),
      confirmLabel: t('users.totp-reset.action'),
    })
    if (confirmed) {
      await apply(() => store.resetTotp(user.id), 'totp-reset', user)
    }
  }

  return { messages, approveTarget, approve, block, unblock, resetTotp }
}
