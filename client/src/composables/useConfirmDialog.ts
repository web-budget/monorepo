import { reactive, readonly } from 'vue'

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

  return {
    state: readonly(state),
    confirm,
    confirmDelete,
    accept: () => settle(true),
    cancel: () => settle(false),
  }
}
