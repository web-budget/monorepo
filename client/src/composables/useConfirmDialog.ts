import { reactive, readonly } from 'vue'
import i18n from '@/locales'

export interface ConfirmOptions {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface ConfirmState {
  open: boolean
  options: ConfirmOptions
}

const state = reactive<ConfirmState>({ open: false, options: {} })

let pendingResolver: ((confirmed: boolean) => void) | null = null

function settle(confirmed: boolean) {
  state.open = false
  const resolver = pendingResolver
  pendingResolver = null
  resolver?.(confirmed)
}

export function useConfirmDialog() {
  function confirm(options: ConfirmOptions = {}): Promise<boolean> {
    settle(false)
    return new Promise((resolve) => {
      pendingResolver = resolve
      state.options = options
      state.open = true
    })
  }

  function confirmDelete(): Promise<boolean> {
    return confirm({ destructive: true })
  }

  function confirmRemoval(entity: string, name: string): Promise<boolean> {
    const { t } = i18n.global
    return confirm({
      destructive: true,
      title: t(`${entity}.remove.title`, { name }),
      description: t(`${entity}.remove.description`, { name }),
      confirmLabel: t('crud.actions.remove'),
    })
  }

  function confirmDiscard(name: string): Promise<boolean> {
    const { t } = i18n.global
    return confirm({
      title: t('crud.discard.title'),
      description: name
        ? t('crud.discard.description-named', { name })
        : t('crud.discard.description'),
      confirmLabel: t('crud.discard.leave'),
      cancelLabel: t('crud.discard.stay'),
    })
  }

  return {
    state: readonly(state),
    confirm,
    confirmDelete,
    confirmRemoval,
    confirmDiscard,
    accept: () => settle(true),
    cancel: () => settle(false),
  }
}
