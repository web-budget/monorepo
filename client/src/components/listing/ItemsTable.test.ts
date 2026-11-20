import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import type { ItemsTableColumn } from '@/components/listing/itemsTable'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import { Select } from '@/components/ui/select'
import { createTestPlugins } from '@/test/mounting'
import { useCompactViewport } from '@/test/crud'

const columns: ItemsTableColumn[] = [
  { field: 'name', header: 'Nome', sortable: true },
  { field: 'bank', header: 'Banco' },
]

const data = [
  { id: '1', active: true, name: 'Main', bank: 'ACME' },
  { id: '2', active: false, name: 'Savings', bank: 'Other' },
]

function render(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  const { plugins } = createTestPlugins({
    routes: [{ path: '/items/:id', name: 'items.detail', component: { render: () => h('div') } }],
  })
  return mount(ItemsTable, {
    props: { data, totalElements: 2, columns, ...props },
    slots: slots as never,
    global: { plugins },
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
  afterEach(() => {
    useCompactViewport(false)
  })

  it('renders the headers with the status last, the badges and the cells', () => {
    const wrapper = render()

    expect(wrapper.findAll('th').map((header) => header.text())).toEqual([
      'Nome',
      'Banco',
      'Situação',
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

  it('aligns and sets in mono the columns that ask for it', () => {
    const wrapper = render({
      columns: [
        { field: 'name', header: 'Nome' },
        { field: 'bank', header: 'Banco', align: 'end', mono: true },
      ],
    })

    const cell = wrapper.findAll('tbody tr')[0]!.findAll('td')[1]!
    expect(cell.classes()).toEqual(expect.arrayContaining(['text-right', 'font-mono']))
    expect(wrapper.findAll('th')[1]!.classes()).toContain('text-right')
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

  it('links the first column to the detail without selecting the row twice', async () => {
    const wrapper = render({ detailRoute: 'items.detail' })

    const link = wrapper.findAll('tbody tr')[0]!.find('a')
    expect(link.text()).toBe('Main')
    expect(link.attributes('href')).toBe('/items/1')

    await link.trigger('click')

    expect(wrapper.emitted('rowSelected')).toBeUndefined()
  })

  it('links the column the table is told to, with the slot content inside the link', () => {
    const wrapper = render(
      { detailRoute: 'items.detail', linkField: 'bank' },
      { 'cell-bank': ({ value }: { value: string }) => h('em', value) },
    )

    const row = wrapper.findAll('tbody tr')[0]!
    expect(row.find('a em').text()).toBe('ACME')
    expect(row.findAll('a')).toHaveLength(1)
  })

  it('copes with a table that has no columns at all', () => {
    const wrapper = render({ columns: [], showStatus: false })

    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.find('tbody a').exists()).toBe(false)
  })

  it('does not link anything without a detail route', () => {
    expect(render().find('tbody a').exists()).toBe(false)
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
      [{ sortField: 'createdOn', sortOrder: 'desc' }],
    ])
  })

  it('sorts by the status column', async () => {
    const wrapper = render()

    await headerButton(wrapper, 'Situação').trigger('click')

    expect(wrapper.emitted('tableSorted')).toEqual([[{ sortField: 'active', sortOrder: 'asc' }]])
  })

  it('does not make a column sortable unless it says so', () => {
    const wrapper = render()

    expect(wrapper.findAll('th button').map((button) => button.text())).toEqual([
      'Nome',
      'Situação',
    ])
  })

  it('falls back to the plain empty text when nothing else explains the empty list', () => {
    const wrapper = render({ data: [], totalElements: 0 })

    expect(wrapper.text()).toContain('Nenhum registro encontrado')
    expect(wrapper.text()).toContain('0–0 de 0')
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

    expect(wrapper.text()).toContain('16–30 de 100')
  })

  it('caps the range at the last record', () => {
    const wrapper = render({ totalElements: 20, currentPage: 1 })

    expect(wrapper.text()).toContain('16–20 de 20')
  })

  it('shows the summary it gets instead of the range, keeping the pagination', () => {
    const wrapper = render({
      totalElements: 100,
      currentPage: 1,
      summary: '100 carteiras encontradas para “abc”',
    })

    expect(wrapper.text()).toContain('100 carteiras encontradas para “abc”')
    expect(wrapper.text()).not.toContain('16–30 de 100')
    expect(wrapper.find('nav[aria-label="pagination"], [data-slot="pagination"]').exists()).toBe(
      true,
    )
  })

  it('gives the cells 48px of height and 16px at the sides, with 15px text, and the header 40px', () => {
    const wrapper = render()

    const cell = wrapper.find('td')
    expect(cell.classes()).toEqual(expect.arrayContaining(['h-12', 'px-4', 'text-[15px]']))
    const head = wrapper.find('th')
    expect(head.classes()).toEqual(expect.arrayContaining(['h-10', 'px-4']))
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

  it('offers the page size only when there is more than one page of the smallest size', () => {
    expect(render({ totalElements: 15 }).findComponent(Select).exists()).toBe(false)
    expect(render({ totalElements: 16 }).findComponent(Select).exists()).toBe(true)
  })
})

describe('ItemsTable on a small screen', () => {
  afterEach(() => {
    useCompactViewport(false)
  })

  function renderCompact(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
    useCompactViewport(true)
    return render(props, slots)
  }

  it('lists the records as cards instead of a table', () => {
    const wrapper = renderCompact()

    expect(wrapper.find('table').exists()).toBe(false)
    const cards = wrapper.findAll('[data-slot="items-cards"] > [data-slot="card"]')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.text()).toContain('Main')
    expect(cards[0]!.text()).toContain('Ativo')
    expect(cards[0]!.text()).toContain('Banco')
    expect(cards[0]!.text()).toContain('ACME')
    expect(cards[1]!.text()).toContain('Inativo')
  })

  it('leaves the status out of the card when the table has none', () => {
    const wrapper = renderCompact({ showStatus: false })

    expect(wrapper.text()).not.toContain('Ativo')
  })

  it('renders the cell slots, the actions and the link on the card', async () => {
    const wrapper = renderCompact(
      { detailRoute: 'items.detail' },
      {
        'cell-bank': ({ value }: { value: string }) => h('em', value),
        actions: ({ item }: { item: { id: string } }) => h('button', { class: 'act' }, item.id),
      },
    )

    const card = wrapper.findAll('[data-slot="items-cards"] > [data-slot="card"]')[0]!
    expect(card.find('a').attributes('href')).toBe('/items/1')
    expect(card.find('em').text()).toBe('ACME')

    await card.find('button.act').trigger('click')
    await card.find('a').trigger('click')
    expect(wrapper.emitted('rowSelected')).toBeUndefined()

    await card.trigger('click')
    expect(wrapper.emitted('rowSelected')).toEqual([[{ data: data[0], index: 0 }]])
  })

  it('renders the title as plain text without a detail route, through its cell slot', () => {
    const wrapper = renderCompact(
      {},
      { 'cell-name': ({ value }: { value: string }) => h('strong', value) },
    )

    const card = wrapper.findAll('[data-slot="items-cards"] > [data-slot="card"]')[0]!
    expect(card.find('a').exists()).toBe(false)
    expect(card.find('strong').text()).toBe('Main')
  })

  it('shows placeholders while loading and no cards for an empty list', () => {
    const loading = renderCompact({ data: [], totalElements: 0, loading: true })
    expect(loading.findAll('[aria-label="Carregando..."]')).toHaveLength(3)

    const empty = renderCompact({ data: [], totalElements: 0 })
    expect(empty.findAll('[data-slot="items-cards"] > [data-slot="card"]')).toHaveLength(0)
  })

  it('copes with a table that has no columns at all', () => {
    const wrapper = renderCompact({ columns: [], detailRoute: 'items.detail' })

    expect(wrapper.findAll('[data-slot="items-cards"] > [data-slot="card"]')).toHaveLength(2)
    expect(wrapper.find('dl').exists()).toBe(false)
  })

  it('has no secondary details for a table with a single column', () => {
    const wrapper = renderCompact({ columns: [{ field: 'name', header: 'Nome' }] })

    expect(wrapper.find('dl').exists()).toBe(false)
  })

  it('sets the numeric details in mono', () => {
    const wrapper = renderCompact({
      columns: [
        { field: 'name', header: 'Nome' },
        { field: 'bank', header: 'Banco', mono: true },
      ],
    })

    expect(wrapper.find('dd').classes()).toContain('font-mono')
  })

  it('lets a wide detail take the whole row of the card', () => {
    const wrapper = renderCompact({
      columns: [
        { field: 'name', header: 'Nome' },
        { field: 'bank', header: 'Banco' },
        { field: 'type', header: 'Tipo', wide: true },
      ],
    })

    const [bank, type] = wrapper.findAll('dl > div')
    expect(bank!.classes()).not.toContain('col-span-2')
    expect(type!.classes()).toContain('col-span-2')
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
