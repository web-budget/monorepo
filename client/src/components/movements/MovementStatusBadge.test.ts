import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MovementStatusBadge from '@/components/movements/MovementStatusBadge.vue'
import i18n from '@/locales'

function render(props: { status: 'OPEN' | 'PAID'; overdue: boolean; dueDate: string }) {
  return mount(MovementStatusBadge, { props, global: { plugins: [i18n] } })
}

describe('MovementStatusBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    [{ status: 'OPEN', overdue: false, dueDate: '2026-11-25' }, 'Em aberto'],
    [{ status: 'PAID', overdue: false, dueDate: '2026-11-05' }, 'Pago'],
    [{ status: 'OPEN', overdue: true, dueDate: '2026-11-20' }, 'Vencido há 1 dia'],
    [{ status: 'OPEN', overdue: true, dueDate: '2026-11-11' }, 'Vencido há 10 dias'],
    [{ status: 'OPEN', overdue: true, dueDate: '2026-11-21' }, 'Vencido'],
  ] as const)('shows %o as %s', (props, text) => {
    expect(render(props).text()).toBe(text)
  })
})
