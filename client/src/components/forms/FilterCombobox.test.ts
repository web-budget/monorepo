import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import FilterCombobox from '@/components/forms/FilterCombobox.vue'
import i18n from '@/locales'
import {
  chooseComboboxOption,
  comboboxOptionTexts,
  comboboxSearchInput,
  comboboxTrigger,
  openCombobox,
  searchCombobox,
} from '@/test/combobox'

const options = [
  { label: 'Casa', value: 'house' },
  { label: 'Casa > Mercado', value: 'market' },
  { label: 'Saúde', value: 'health' },
  { label: 'Água e esgoto', value: 'water' },
]

function render(modelValue: string, props: Record<string, unknown> = {}) {
  return mount(FilterCombobox, {
    props: {
      label: 'Centro de custo',
      noneLabel: 'Todos',
      options,
      searchPlaceholder: 'Buscar centro de custo',
      emptyMessage: 'Nenhum centro de custo encontrado.',
      modelValue,
      ...props,
    },
    global: { plugins: [i18n] },
    attachTo: document.body,
  })
}

describe('FilterCombobox', () => {
  it('shows its label and the none label for an empty value', () => {
    const wrapper = render('')

    expect(wrapper.text()).toContain('Centro de custo')
    expect(comboboxTrigger(wrapper).text()).toBe('Todos')
  })

  it('names the trigger by the label even when the label is hidden', () => {
    const wrapper = render('', { hideLabel: true })

    expect(wrapper.find('label').exists()).toBe(false)
    expect(comboboxTrigger(wrapper).attributes('aria-label')).toBe('Centro de custo')
  })

  it('marks the label with an asterisk only when required', () => {
    expect(render('').text()).not.toContain('*')
    expect(render('', { required: true }).text()).toContain('*')
  })

  it('shows the selected option', () => {
    expect(comboboxTrigger(render('market')).text()).toBe('Casa > Mercado')
  })

  it('opens with the none option pinned first and then every option', async () => {
    const wrapper = render('')

    await openCombobox(wrapper)

    expect(comboboxOptionTexts()).toEqual(['Todos', ...options.map((option) => option.label)])
    expect(comboboxSearchInput()!.getAttribute('aria-label')).toBe('Buscar centro de custo')
  })

  it('has no none option without a none label', async () => {
    const wrapper = render('health', { noneLabel: undefined })

    await openCombobox(wrapper)

    expect(comboboxOptionTexts()).toEqual(options.map((option) => option.label))
  })

  it('hides the none option while searching and filters without accents', async () => {
    const wrapper = render('')
    await openCombobox(wrapper)

    await searchCombobox('saude')
    expect(comboboxOptionTexts()).toEqual(['Saúde'])

    await searchCombobox('agua')
    expect(comboboxOptionTexts()).toEqual(['Água e esgoto'])
  })

  it('shows the empty message when nothing matches', async () => {
    const wrapper = render('')
    await openCombobox(wrapper)

    await searchCombobox('pet')

    expect(comboboxOptionTexts()).toEqual([])
    expect(document.body.textContent).toContain('Nenhum centro de custo encontrado.')
  })

  it('emits the chosen value', async () => {
    const wrapper = render('')
    await openCombobox(wrapper)

    await chooseComboboxOption('Saúde')

    expect(wrapper.emitted('update:modelValue')).toEqual([['health']])
  })

  it('emits an empty value for the none option', async () => {
    const wrapper = render('health')
    await openCombobox(wrapper)

    await chooseComboboxOption('Todos')

    expect(wrapper.emitted('update:modelValue')).toEqual([['']])
  })

  it('shows the loading state and cannot be opened while loading', async () => {
    const wrapper = render('', { loading: true })

    await comboboxTrigger(wrapper).trigger('click')

    expect(comboboxTrigger(wrapper).text()).toBe('Carregando…')
    expect(comboboxTrigger(wrapper).attributes('disabled')).toBeDefined()
    expect(comboboxSearchInput()).toBeNull()
  })
})
