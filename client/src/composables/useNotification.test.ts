import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { useNotification } from '@/composables/useNotification'

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

describe('useNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('translates the title and the detail by default', () => {
    useNotification().showSuccess('notification.record-created', 'notification.wallet.created')

    expect(toast.success).toHaveBeenCalledWith('Registro criado', {
      description: 'Carteira criada com sucesso',
      duration: 4000,
    })
  })

  it('fills the placeholders of the title and the detail with the given parameters', () => {
    useNotification().showSuccess('wallet.toast.created', 'wallet.toast.created-detail', true, {
      name: 'Main',
    })

    expect(toast.success).toHaveBeenCalledWith('Carteira criada', {
      description: '“Main” já aparece nos lançamentos.',
      duration: 4000,
    })
  })

  it('shows a title alone when there is no detail', () => {
    useNotification().showInfo('notification.success')

    expect(toast.info).toHaveBeenCalledWith('Sucesso!', {
      description: undefined,
      duration: 4000,
    })
  })

  it('keeps raw text when localization is off', () => {
    useNotification().showWarn('Raw title', 'Raw detail', false)

    expect(toast.warning).toHaveBeenCalledWith('Raw title', {
      description: 'Raw detail',
      duration: 4000,
    })
  })

  it('shows an error toast', () => {
    useNotification().showError('notification.error')

    expect(toast.error).toHaveBeenCalledWith('Erro', { description: undefined, duration: 4000 })
  })

  it('renders an API warning with every detail on its own line', () => {
    useNotification().showApiNotice({
      severity: 'warn',
      title: { key: 'error.conflict.title' },
      details: [
        { key: 'error.conflict.wallet.name', params: { value: 'Main' } },
        { key: 'error.unknown.details' },
      ],
    })

    expect(toast.warning).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        description: expect.stringContaining('Nome "Main" já está em uso\n'),
      }),
    )
  })

  it('renders an API error as an error toast', () => {
    useNotification().showApiNotice({
      severity: 'error',
      title: { key: 'error.unknown.title' },
      details: [{ key: 'error.unknown.details' }],
    })

    expect(toast.error).toHaveBeenCalledTimes(1)
  })
})
