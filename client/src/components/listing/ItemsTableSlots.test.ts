import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import { useCompactViewport } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'

const columns = [
  { field: 'select', header: 'Selecionar', mobile: 'hide' as const },
  { field: 'name', header: 'Nome', mobile: 'title' as const },
]
const data = [{ id: '1', name: 'Main' }]

function render(slots: Record<string, unknown> = {}) {
  const { plugins } = createTestPlugins()
  return mount(ItemsTable, {
    props: { data, totalElements: 1, columns, showStatus: false },
    slots: slots as never,
    global: { plugins },
  })
}

describe('ItemsTable header and card slots', () => {
  afterEach(() => {
    useCompactViewport(false)
  })

  it('shows the header of the column unless a header slot takes its place', () => {
    const plain = render()
    const custom = render({ 'header-select': () => h('input', { type: 'checkbox' }) })

    expect(plain.findAll('th').map((header) => header.text())).toEqual(['Selecionar', 'Nome'])
    expect(custom.findAll('th')[0]!.find('input[type="checkbox"]').exists()).toBe(true)
    expect(custom.findAll('th')[1]!.text()).toBe('Nome')
  })

  it('shows the slot before the cards of the phone and nothing without it', () => {
    useCompactViewport(true)

    const without = render()
    const withSlot = render({ 'before-cards': () => h('p', { 'data-slot': 'before' }, 'Todas') })

    expect(without.find('[data-slot="before"]').exists()).toBe(false)
    expect(withSlot.find('[data-layout="compact"] > [data-slot="before"]').text()).toBe('Todas')
  })
})
