import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SearchControls from '@/components/listing/SearchControls.vue'
import i18n from '@/locales'

function render(props: Record<string, unknown> = {}) {
  return mount(SearchControls, {
    props: { filter: '', status: 'ACTIVE', ...props },
    global: { plugins: [i18n] },
  })
}

function buttonWithText(wrapper: ReturnType<typeof render>, text: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === text)
  if (!button) {
    throw new Error(`no button "${text}"`)
  }
  return button
}

describe('SearchControls', () => {
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

  it('emits update:filter while typing', async () => {
    const wrapper = render({ placeholder: 'Buscar por nome' })

    await wrapper.find('input').setValue('abc')

    expect(wrapper.emitted('update:filter')).toEqual([['abc']])
    expect(wrapper.find('input').attributes('placeholder')).toBe('Buscar por nome')
  })

  it('fires a filter change on Enter', async () => {
    const wrapper = render()

    await wrapper.find('input').trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:status')).toEqual([['ACTIVE']])
    expect(wrapper.emitted('onFilterChange')).toHaveLength(1)
  })

  it('fires a filter change on the search button', async () => {
    const wrapper = render()

    await buttonWithText(wrapper, 'Buscar').trigger('click')

    expect(wrapper.emitted('onFilterChange')).toHaveLength(1)
  })

  it('resets the status and the filter to their initial values', async () => {
    const wrapper = render({ status: 'ALL', filter: 'abc', statusInitialValue: 'INACTIVE' })

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')

    expect(wrapper.emitted('update:status')).toEqual([['INACTIVE']])
    expect(wrapper.emitted('update:filter')).toEqual([['']])
    expect(wrapper.emitted('onFilterReset')).toHaveLength(1)
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
    expect(buttonWithText(wrapper, 'Inativos').attributes('aria-pressed')).toBe('true')
  })

  it('resets to the active status by default', async () => {
    const wrapper = render({ status: 'ALL' })

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')

    expect(wrapper.emitted('update:status')).toEqual([['ACTIVE']])
  })

  it('emits onNew', async () => {
    const wrapper = render()

    await buttonWithText(wrapper, 'Novo').trigger('click')

    expect(wrapper.emitted('onNew')).toHaveLength(1)
  })

  it('renders custom status options', () => {
    const wrapper = render({ statusOptions: [{ label: 'status.active', value: 'ACTIVE' }] })

    expect(wrapper.findAll('[aria-pressed]')).toHaveLength(1)
  })
})
