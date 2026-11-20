import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SearchControls from '@/components/listing/SearchControls.vue'
import i18n from '@/locales'

function render(props: Record<string, unknown> = {}) {
  return mount(SearchControls, {
    props: { filter: '', status: 'ACTIVE', ...props },
    attachTo: document.body,
    global: { plugins: [i18n] },
  })
}

function buttonWithText(wrapper: ReturnType<typeof render>, text: string) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text().replace(/\s+\d+$/, '') === text)
  if (!button) {
    throw new Error(`no button "${text}"`)
  }
  return button
}

describe('SearchControls', () => {
  it('lists the most used status first and ends with all', () => {
    const wrapper = render()

    expect(wrapper.findAll('[aria-pressed]').map((button) => button.text())).toEqual([
      'Ativos',
      'Inativos',
      'Todos',
    ])
  })

  it('marks the current status as pressed', () => {
    const wrapper = render({ status: 'INACTIVE' })

    expect(buttonWithText(wrapper, 'Inativos').attributes('aria-pressed')).toBe('true')
    expect(buttonWithText(wrapper, 'Ativos').attributes('aria-pressed')).toBe('false')
  })

  it('emits the new status and a filter change when a status is picked', async () => {
    const wrapper = render()

    await buttonWithText(wrapper, 'Todos').trigger('click')

    expect(wrapper.emitted('update:status')).toEqual([['ALL']])
    expect(wrapper.emitted('onFilterChange')).toHaveLength(1)
  })

  it('shows the count of each status that has one', () => {
    const wrapper = render({ counts: { ACTIVE: 4, INACTIVE: 0, ALL: null } })

    expect(wrapper.findAll('[data-slot="status-count"]').map((count) => count.text())).toEqual([
      '4',
      '0',
    ])
  })

  it('emits update:filter while typing without searching', async () => {
    const wrapper = render({ placeholder: 'Buscar por nome' })

    await wrapper.find('input').setValue('abc')
    await wrapper.find('input').setValue('abcd')

    expect(wrapper.emitted('update:filter')).toEqual([['abc'], ['abcd']])
    expect(wrapper.find('input').attributes('placeholder')).toBe('Buscar por nome')
    expect(wrapper.emitted('onFilterChange')).toBeUndefined()
  })

  it('searches immediately on Enter', async () => {
    const wrapper = render()

    await wrapper.find('input').trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('onFilterChange')).toHaveLength(1)
    expect(wrapper.emitted('update:status')).toBeUndefined()
  })

  it('searches when the search button is clicked', async () => {
    const wrapper = render()

    await wrapper.find('button[aria-label="Buscar"]').trigger('click')

    expect(wrapper.emitted('onFilterChange')).toHaveLength(1)
    expect(wrapper.emitted('update:status')).toBeUndefined()
  })

  it('follows the filter the parent sets', async () => {
    const wrapper = render({ filter: 'abc' })

    await wrapper.setProps({ filter: 'xyz' })

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('xyz')
  })

  it('offers to clear the text only while there is text', async () => {
    const wrapper = render()
    expect(wrapper.find('button[aria-label="Limpar filtro"]').exists()).toBe(false)

    await wrapper.find('input').setValue('abc')

    expect(wrapper.find('button[aria-label="Limpar filtro"]').exists()).toBe(true)
  })

  it('clears the text without touching the status', async () => {
    const wrapper = render({ status: 'ALL', filter: 'abc' })

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')

    expect(wrapper.emitted('update:filter')).toEqual([['']])
    expect(wrapper.emitted('update:status')).toBeUndefined()
    expect(wrapper.emitted('onFilterReset')).toHaveLength(1)
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })

  it('makes the field 40px tall and up to 672px wide, as one group with the search button', () => {
    const wrapper = render()

    const form = wrapper.find('form[role="search"]')
    expect(form.classes()).toEqual(expect.arrayContaining(['w-full', 'max-w-2xl', 'flex-1']))
    const group = form.find('div')
    expect(group.classes()).toContain('h-10')
    expect(wrapper.find('input').classes()).toContain('text-[15px]')
  })

  it('puts the magnifier at the end of the field as the only search button, and no text button', () => {
    const wrapper = render({ filter: 'abc' })

    const buttons = wrapper.find('form').findAll('button')
    expect(buttons.map((button) => button.attributes('aria-label'))).toEqual([
      'Limpar filtro',
      'Buscar',
    ])
    const search = buttons[1]!
    expect(search.attributes('type')).toBe('submit')
    expect(search.text()).toBe('')
    expect(search.find('svg').exists()).toBe(true)
    expect(search.classes()).toEqual(expect.arrayContaining(['border-l', 'bg-muted']))
    expect(wrapper.findAll('button').filter((button) => button.text() === 'Buscar')).toHaveLength(0)
    const start = wrapper.find('input').element.compareDocumentPosition(search.element)
    expect(start & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('searches once when the form is submitted', async () => {
    const wrapper = render()

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('onFilterChange')).toHaveLength(1)
  })

  it('renders custom status options', () => {
    const wrapper = render({ statusOptions: [{ label: 'status.active', value: 'ACTIVE' }] })

    expect(wrapper.findAll('[aria-pressed]')).toHaveLength(1)
  })
})
