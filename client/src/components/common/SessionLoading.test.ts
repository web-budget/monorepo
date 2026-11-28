import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SessionLoading from '@/components/common/SessionLoading.vue'
import { createTestPlugins } from '@/test/mounting'

describe('SessionLoading', () => {
  it('shows the pulsing brand mark as a status, with no visible text', () => {
    const { plugins } = createTestPlugins()
    const wrapper = mount(SessionLoading, { global: { plugins } })

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-label')).toBe('Carregando...')
    expect(wrapper.find('[data-slot="brand-mark"]').classes()).toContain('animate-pulse')
    expect(wrapper.text()).toBe('')
  })
})
