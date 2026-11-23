import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StatusTabs from '@/components/listing/StatusTabs.vue'
import { createTestPlugins } from '@/test/mounting'

const options = [
  { label: 'search-control.active', value: 'ACTIVE' },
  { label: 'search-control.all', value: 'ALL' },
]

function render(counts?: Record<string, number | null>) {
  const { plugins } = createTestPlugins()
  return mount(StatusTabs, { props: { status: 'ACTIVE', options, counts }, global: { plugins } })
}

describe('StatusTabs', () => {
  it('marks the current status and counts the tabs that have a count', () => {
    const wrapper = render({ ACTIVE: 4, ALL: null })

    const tabs = wrapper.findAll('button')
    expect(tabs.map((tab) => tab.attributes('aria-pressed'))).toEqual(['true', 'false'])
    expect(tabs[0]!.find('[data-slot="status-count"]').text()).toBe('4')
    expect(tabs[1]!.find('[data-slot="status-count"]').exists()).toBe(false)
  })

  it('shows no count without counts and emits the chosen status', async () => {
    const wrapper = render()

    await wrapper.findAll('button')[1]!.trigger('click')

    expect(wrapper.find('[data-slot="status-count"]').exists()).toBe(false)
    expect(wrapper.emitted('select')).toEqual([['ALL']])
  })
})
