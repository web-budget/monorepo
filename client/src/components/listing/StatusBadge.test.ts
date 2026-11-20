import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StatusBadge from '@/components/listing/StatusBadge.vue'
import i18n from '@/locales'

function render(props: { active?: boolean; feminine?: boolean }) {
  return mount(StatusBadge, { props, global: { plugins: [i18n] } })
}

describe('StatusBadge', () => {
  it('shows the active label', () => {
    expect(render({ active: true }).text()).toBe('Ativo')
  })

  it('shows the inactive label', () => {
    expect(render({ active: false }).text()).toBe('Inativo')
  })

  it('is inactive by default', () => {
    expect(render({}).text()).toBe('Inativo')
  })

  it('shows the feminine labels for a feminine entity', () => {
    expect(render({ active: true, feminine: true }).text()).toBe('Ativa')
    expect(render({ active: false, feminine: true }).text()).toBe('Inativa')
  })

  it('dims the badge of an inactive record', () => {
    expect(render({ active: false }).classes()).toContain('opacity-70')
    expect(render({ active: true }).classes()).not.toContain('opacity-70')
  })
})
