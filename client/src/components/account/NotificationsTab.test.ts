import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotificationsTab from '@/components/account/NotificationsTab.vue'
import { useAuthStore } from '@/stores/auth'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'

const showSuccess = vi.fn<(title: string, detail?: string) => void>()

vi.mock('@/composables/useNotification', () => ({
  useNotification: () => ({ showSuccess }),
}))

function render(dueDateNotices: boolean) {
  const { plugins } = createTestPlugins({
    initialState: { auth: { session: { name: 'Ana', dueDateNotices } } },
  })
  return mount(NotificationsTab, { attachTo: document.body, global: { plugins } })
}

describe('NotificationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the switch on with the two kinds of notice', () => {
    const wrapper = render(true)

    const toggle = wrapper.get('[role="switch"]')
    expect(toggle.attributes('aria-checked')).toBe('true')
    expect(wrapper.text()).toContain('Receber os avisos de vencimento por e-mail')
    expect(wrapper.text()).toContain('Ligado.')
    expect(wrapper.text()).toContain('Diário: um e-mail por dia, só quando algo vence naquele dia.')
    expect(wrapper.text()).toContain('Semanal: toda sexta')
  })

  it('shows the switch off', () => {
    const wrapper = render(false)

    expect(wrapper.get('[role="switch"]').attributes('aria-checked')).toBe('false')
    expect(wrapper.text()).toContain('Desligado.')
  })

  it('saves at once and says the notices were turned off', async () => {
    const wrapper = render(true)
    vi.mocked(useAuthStore().changeDueDateNotices).mockResolvedValue()

    await wrapper.get('[role="switch"]').trigger('click')
    await settle()

    expect(useAuthStore().changeDueDateNotices).toHaveBeenCalledWith(false)
    expect(showSuccess).toHaveBeenCalledWith(
      'account.notifications.saved',
      'account.notifications.saved-off',
    )
  })

  it('says the notices were turned on', async () => {
    const wrapper = render(false)
    vi.mocked(useAuthStore().changeDueDateNotices).mockResolvedValue()

    await wrapper.get('[role="switch"]').trigger('click')
    await settle()

    expect(showSuccess).toHaveBeenCalledWith(
      'account.notifications.saved',
      'account.notifications.saved-on',
    )
  })

  it('does not say it saved when the server refuses', async () => {
    const wrapper = render(true)
    vi.mocked(useAuthStore().changeDueDateNotices).mockRejectedValue(new Error('refused'))

    await wrapper.get('[role="switch"]').trigger('click')
    await settle()

    expect(showSuccess).not.toHaveBeenCalled()
  })
})
