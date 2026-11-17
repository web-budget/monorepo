import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import type { ItemsTableColumn } from '@/components/listing/itemsTable'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import { Select } from '@/components/ui/select'
import i18n from '@/locales'

const columns: ItemsTableColumn[] = [
  { field: 'name', header: 'Nome', sortable: true },
  { field: 'bank', header: 'Banco' },
]

const data = [
  { id: '1', active: true, name: 'Main', bank: 'ACME' },
  { id: '2', active: false, name: 'Savings', bank: 'Other' },
]

function render(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  return mount(ItemsTable, {
    props: { data, totalElements: 2, columns, ...props },
    slots: slots as never,
    global: { plugins: [i18n] },
  })
}

function headerButton(wrapper: ReturnType<typeof render>, text: string) {
  const button = wrapper.findAll('th button').find((candidate) => candidate.text() === text)
  if (!button) {
    throw new Error(`no header "${text}"`)
  }
  return button
}

describe('ItemsTable', () => {
  it('renders the headers, the status badges and the cells', () => {
    const wrapper = render()

    expect(wrapper.findAll('th').map((header) => header.text())).toEqual([
      'Status',
      'Nome',
      'Banco',
    ])
    const firstRow = wrapper.findAll('tbody tr')[0]!
    expect(firstRow.text()).toContain('Ativo')
    expect(firstRow.text()).toContain('Main')
    expect(firstRow.text()).toContain('ACME')
    expect(wrapper.findAll('tbody tr')[1]!.text()).toContain('Inativo')
  })

  it('hides the status column when asked to', () => {
    const wrapper = render({ showStatus: false })

    expect(wrapper.findAll('th').map((header) => header.text())).toEqual(['Nome', 'Banco'])
    expect(wrapper.text()).not.toContain('Ativo')
  })

  it('renders a custom cell through the cell slot', () => {
    const wrapper = render(
      {},
      {
        'cell-bank': ({ item, value }: { item: { name: string }; value: string }) =>
          h('em', `${item.name}:${value}`),
      },
    )

    expect(wrapper.find('tbody em').text()).toBe('Main:ACME')
  })

  it('renders an actions column through the actions slot without selecting the row', async () => {
    const wrapper = render(
      {},
      { actions: ({ item }: { item: { id: string } }) => h('button', { class: 'act' }, item.id) },
    )

    expect(wrapper.findAll('th').pop()!.text()).toBe('Ações')
    await wrapper.find('button.act').trigger('click')

    expect(wrapper.emitted('rowSelected')).toBeUndefined()
  })

  it('has no actions column without the actions slot', () => {
    expect(render().text()).not.toContain('Ações')
  })

  it('emits rowSelected with the item and its index', async () => {
    const wrapper = render()

    await wrapper.findAll('tbody tr')[1]!.trigger('click')

    expect(wrapper.emitted('rowSelected')).toEqual([[{ data: data[1], index: 1 }]])
  })

  it('cycles a sortable column through ascending, descending and back to the default', async () => {
    const wrapper = render()
    const nameHeader = () => wrapper.findAll('th').find((header) => header.text() === 'Nome')!

    expect(nameHeader().attributes('aria-sort')).toBe('none')

    await headerButton(wrapper, 'Nome').trigger('click')
    expect(nameHeader().attributes('aria-sort')).toBe('ascending')

    await headerButton(wrapper, 'Nome').trigger('click')
    expect(nameHeader().attributes('aria-sort')).toBe('descending')

    await headerButton(wrapper, 'Nome').trigger('click')
    expect(nameHeader().attributes('aria-sort')).toBe('none')

    expect(wrapper.emitted('tableSorted')).toEqual([
      [{ sortField: 'name', sortOrder: 'asc' }],
      [{ sortField: 'name', sortOrder: 'desc' }],
      [{ sortField: 'createdOn', sortOrder: 'asc' }],
    ])
  })

  it('sorts by the status column', async () => {
    const wrapper = render()

    await headerButton(wrapper, 'Status').trigger('click')

    expect(wrapper.emitted('tableSorted')).toEqual([[{ sortField: 'active', sortOrder: 'asc' }]])
  })

  it('does not make a column sortable unless it says so', () => {
    const wrapper = render()

    expect(wrapper.findAll('th button').map((button) => button.text())).toEqual(['Status', 'Nome'])
  })

  it('shows the empty state', () => {
    const wrapper = render({ data: [], totalElements: 0 })

    expect(wrapper.text()).toContain('Nenhum registro encontrado')
    expect(wrapper.text()).toContain('0 até 0, total 0')
  })

  it('shows loading placeholders while loading with no data', () => {
    const wrapper = render({ data: [], totalElements: 0, loading: true })

    expect(wrapper.findAll('tbody tr[aria-label="Carregando..."]')).toHaveLength(3)
    expect(wrapper.text()).not.toContain('Nenhum registro encontrado')
  })

  it('keeps the rows visible while reloading', () => {
    const wrapper = render({ loading: true })

    expect(wrapper.text()).toContain('Main')
    expect(wrapper.find('tbody').classes()).toContain('opacity-60')
  })

  it('does not dim the rows when not loading', () => {
    expect(render().find('tbody').classes()).not.toContain('opacity-60')
  })

  it('reports the range of the current page', () => {
    const wrapper = render({ totalElements: 100, currentPage: 1 })

    expect(wrapper.text()).toContain('16 até 30, total 100')
  })

  it('caps the range at the last record', () => {
    const wrapper = render({ totalElements: 20, currentPage: 1 })

    expect(wrapper.text()).toContain('16 até 20, total 20')
  })

  it('emits a zero-based page when a page number is clicked', async () => {
    const wrapper = render({ totalElements: 100 })

    const pageThree = wrapper.findAll('button').find((button) => button.text() === '3')!
    await pageThree.trigger('click')

    expect(wrapper.emitted('pageChanged')).toEqual([[{ currentPage: 2, pageSize: 15 }]])
  })

  it('goes to the next page', async () => {
    const wrapper = render({ totalElements: 100 })

    await wrapper.find('button[aria-label="Próxima página"]').trigger('click')

    expect(wrapper.emitted('pageChanged')).toEqual([[{ currentPage: 1, pageSize: 15 }]])
  })

  it('shows an ellipsis when there are many pages', () => {
    const wrapper = render({ totalElements: 300 })

    expect(wrapper.find('[data-slot="pagination-ellipsis"]').exists()).toBe(true)
  })

  it('goes back to the first page when the page size changes', () => {
    const wrapper = render({ totalElements: 100, currentPage: 3 })

    wrapper.getComponent(Select).vm.$emit('update:modelValue', '30')

    expect(wrapper.emitted('pageChanged')).toEqual([[{ currentPage: 0, pageSize: 30 }]])
  })
})

describe('ItemsTable column span', () => {
  const emptyCell = (wrapper: ReturnType<typeof render>) =>
    wrapper.find('tbody td').attributes('colspan')

  it('spans the status, data and actions columns', () => {
    const wrapper = render({ data: [], totalElements: 0 }, { actions: () => h('span') })

    expect(emptyCell(wrapper)).toBe('4')
  })

  it('spans only the data columns when there is no status and no actions', () => {
    const wrapper = render({ data: [], totalElements: 0, showStatus: false })

    expect(emptyCell(wrapper)).toBe('2')
  })
})
