import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { useForm } from 'vee-validate'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import ComboboxField from '@/components/forms/ComboboxField.vue'
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
  { label: 'Casa > Manutenção', value: 'house-maintenance' },
  { label: 'Saúde', value: 'health' },
  { label: 'Saúde > Farmácia', value: 'pharmacy' },
  { label: 'Água e esgoto', value: 'water' },
]

let values: () => Record<string, unknown> = () => ({})

function render(
  props: Record<string, unknown> = {},
  initialValue: string | null = null,
  errorMessage?: string,
) {
  const Host = defineComponent({
    setup() {
      const form = useForm({
        initialValues: { field: initialValue },
        initialErrors: { field: errorMessage },
      })
      values = () => form.values
      return () =>
        h(ComboboxField, {
          name: 'field',
          label: 'Centro de custo',
          options,
          placeholder: 'Selecione',
          searchPlaceholder: 'Buscar centro de custo',
          emptyMessage: 'Nenhum centro de custo encontrado.',
          ...props,
        })
    },
  })
  return mount(Host, { global: { plugins: [i18n] }, attachTo: document.body })
}

const trigger = (wrapper: VueWrapper) => comboboxTrigger(wrapper)
const searchInput = comboboxSearchInput
const optionTexts = comboboxOptionTexts
const open = (wrapper: VueWrapper) => openCombobox(wrapper)
const search = searchCombobox
const choose = chooseComboboxOption

describe('ComboboxField', () => {
  it('shows the placeholder, the label and the required mark', () => {
    const wrapper = render({ required: true })

    expect(wrapper.text()).toContain('Centro de custo')
    expect(wrapper.text()).toContain('*')
    expect(trigger(wrapper).text()).toBe('Selecione')
  })

  it('names the trigger by the field label and links it to the label', () => {
    const wrapper = render()

    expect(trigger(wrapper).attributes('aria-label')).toBe('Centro de custo')
    expect(trigger(wrapper).attributes('id')).toBe(wrapper.get('label').attributes('for'))
    expect(trigger(wrapper).attributes('tabindex')).toBe('0')
  })

  it('shows the selected option with the parent path muted', () => {
    const wrapper = render({}, 'pharmacy')

    const parts = trigger(wrapper).findAll('span span')
    expect(trigger(wrapper).text()).toBe('Saúde > Farmácia')
    expect(parts[0]!.classes()).toContain('text-muted-foreground')
    expect(parts[1]!.classes()).not.toContain('text-muted-foreground')
  })

  it('keeps the placeholder when the value is not among the options', () => {
    const wrapper = render({}, 'gone')

    expect(trigger(wrapper).text()).toBe('Selecione')
  })

  it('opens with the whole list and a focused search field', async () => {
    const wrapper = render()

    await open(wrapper)

    expect(optionTexts()).toEqual(options.map((option) => option.label))
    expect(searchInput()!.getAttribute('aria-label')).toBe('Buscar centro de custo')
    expect(searchInput()!.getAttribute('placeholder')).toBe('Buscar centro de custo')
    expect(document.activeElement).toBe(searchInput())
  })

  it('opens with the arrow down key', async () => {
    const wrapper = render()

    await trigger(wrapper).trigger('keydown', { key: 'ArrowDown' })
    await flushPromises()

    expect(searchInput()).not.toBeNull()
  })

  it('filters without regard to accents or case and searches the whole label', async () => {
    const wrapper = render()
    await open(wrapper)

    await search('saude')
    expect(optionTexts()).toEqual(['Saúde', 'Saúde > Farmácia'])

    await search('AGUA')
    expect(optionTexts()).toEqual(['Água e esgoto'])

    await search('farm')
    expect(optionTexts()).toEqual(['Saúde > Farmácia'])
  })

  it('bolds the matched text without using the highlighter', async () => {
    const wrapper = render()
    await open(wrapper)

    await search('agua')

    const matched = document.body.querySelector('[role="option"] .font-semibold')
    expect(matched?.textContent).toBe('Água')
    expect(document.body.querySelector('.highlight, mark')).toBeNull()
  })

  it('shows the parent path of a child option muted', async () => {
    const wrapper = render()
    await open(wrapper)

    await search('manut')

    const parent = document.body.querySelector('[role="option"] .text-muted-foreground')
    expect(parent?.textContent).toBe('Casa > ')
  })

  it('shows the empty message when nothing matches', async () => {
    const wrapper = render()
    await open(wrapper)

    await search('pet')

    expect(optionTexts()).toEqual([])
    expect(document.body.textContent).toContain('Nenhum centro de custo encontrado.')
  })

  it('makes the first match active as the user types', async () => {
    const wrapper = render()
    await open(wrapper)

    await search('saude')

    const active = document.body.querySelector('[role="option"][data-highlighted]')
    expect(active?.textContent?.trim()).toBe('Saúde')
  })

  it('sets the chosen value and closes', async () => {
    const wrapper = render()
    await open(wrapper)

    await choose('Saúde > Farmácia')

    expect(values().field).toBe('pharmacy')
    expect(searchInput()).toBeNull()
    expect(trigger(wrapper).text()).toBe('Saúde > Farmácia')
  })

  it('picks the highlighted option with Enter', async () => {
    const wrapper = render()
    await open(wrapper)
    await search('agua')

    searchInput()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()

    expect(values().field).toBe('water')
  })

  it('closes with Escape, clears the search and returns focus to the trigger', async () => {
    const wrapper = render()
    await open(wrapper)
    await search('saude')

    searchInput()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(searchInput()).toBeNull()
    expect(document.activeElement).toBe(trigger(wrapper).element)
    await open(wrapper)
    expect(searchInput()!.value).toBe('')
    expect(optionTexts()).toHaveLength(options.length)
  })

  it('marks the selected option in the list', async () => {
    const wrapper = render({}, 'health')

    await open(wrapper)

    const selected = document.body.querySelector('[role="option"][data-state="checked"]')
    expect(selected?.textContent?.trim()).toBe('Saúde')
  })

  describe('with a none label', () => {
    it('shows it pinned on top with a separator and the field value as null', async () => {
      const wrapper = render({ noneLabel: 'Escolher' })

      expect(trigger(wrapper).text()).toBe('Escolher')
      await open(wrapper)
      expect(optionTexts()[0]).toBe('Escolher')
      expect(document.body.querySelector('[data-slot="combobox-separator"]')).not.toBeNull()
    })

    it('hides it while there is text in the search', async () => {
      const wrapper = render({ noneLabel: 'Escolher' })
      await open(wrapper)

      await search('casa')

      expect(optionTexts()).not.toContain('Escolher')
      await search('')
      expect(optionTexts()[0]).toBe('Escolher')
    })

    it('turns choosing it into null', async () => {
      const wrapper = render({ noneLabel: 'Escolher' }, 'house')
      await open(wrapper)

      await choose('Escolher')

      expect(values().field).toBeNull()
      expect(trigger(wrapper).text()).toBe('Escolher')
    })
  })

  it('has no pinned option without a none label', async () => {
    const wrapper = render()

    await open(wrapper)

    expect(document.body.querySelector('[data-slot="combobox-separator"]')).toBeNull()
  })

  it('cannot be opened when disabled', async () => {
    const wrapper = render({ disabled: true })

    await trigger(wrapper).trigger('click')
    await flushPromises()

    expect(trigger(wrapper).attributes('disabled')).toBeDefined()
    expect(searchInput()).toBeNull()
  })

  it('shows a spinner and a loading message, disabled, while the options load', () => {
    const wrapper = render({ loading: true })

    expect(trigger(wrapper).text()).toBe('Carregando…')
    expect(trigger(wrapper).attributes('disabled')).toBeDefined()
    expect(trigger(wrapper).attributes('aria-busy')).toBe('true')
    expect(trigger(wrapper).find('svg.animate-spin').exists()).toBe(true)
  })

  it('flags the trigger as invalid and shows the validation message', async () => {
    const wrapper = render({}, null, 'Campo obrigatório')
    await flushPromises()

    expect(trigger(wrapper).attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('Campo obrigatório')
  })

  it('shows the hint', () => {
    const wrapper = render({ hint: 'Só despesas.' })

    expect(wrapper.text()).toContain('Só despesas.')
  })
})
