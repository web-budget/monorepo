import { flushPromises, type VueWrapper } from '@vue/test-utils'
import ComboboxField from '@/components/forms/ComboboxField.vue'
import FilterCombobox from '@/components/forms/FilterCombobox.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ComboboxPicker from '@/components/forms/ComboboxPicker.vue'

export function comboboxTrigger(wrapper: VueWrapper, label?: string) {
  const triggers = wrapper.findAll('button[aria-haspopup="listbox"]')
  const found = label
    ? triggers.find((trigger) => trigger.attributes('aria-label') === label)
    : triggers[0]
  if (!found) {
    throw new Error(`No combobox trigger${label ? ` named ${label}` : ''}`)
  }
  return found
}

export function comboboxSearchInput() {
  return document.body.querySelector<HTMLInputElement>('input[role="combobox"]')
}

export function comboboxOptionTexts() {
  return Array.from(document.body.querySelectorAll('[role="option"]')).map((element) =>
    element.textContent?.trim(),
  )
}

export async function openCombobox(wrapper: VueWrapper, label?: string) {
  await comboboxTrigger(wrapper, label).trigger('click')
  await flushPromises()
}

export async function searchCombobox(text: string) {
  const input = comboboxSearchInput()!
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

export async function chooseComboboxOption(text: string) {
  const option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (element) => element.textContent?.trim() === text,
  )
  if (!option) {
    throw new Error(`No combobox option ${text}`)
  }
  option.click()
  await flushPromises()
}

export function comboboxField(wrapper: VueWrapper, name: string) {
  const field = wrapper
    .findAllComponents(ComboboxField)
    .find((candidate) => candidate.props('name') === name)
  if (!field) {
    throw new Error(`No combobox field ${name}`)
  }
  return field
}

export function pickComboboxValue(wrapper: VueWrapper, name: string, value: string) {
  comboboxField(wrapper, name).getComponent(ComboboxPicker).vm.$emit('update:modelValue', value)
}

export function filterFields(wrapper: VueWrapper) {
  const fields = [
    ...wrapper.findAllComponents(FilterSelect),
    ...wrapper.findAllComponents(FilterCombobox),
  ]
  const ordered = fields.sort((first, second) =>
    first.element.compareDocumentPosition(second.element) & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1,
  )
  return ordered as unknown as VueWrapper<InstanceType<typeof FilterSelect>>[]
}
