import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import MoveMovementDialog from '@/components/periods/MoveMovementDialog.vue'
import { createTestPlugins } from '@/test/mounting'
import type { ClosingPeriodView } from '@/types'

const past: ClosingPeriodView = {
  id: 'p-10',
  name: 'Outubro',
  startingAt: '2000-10-01',
  endingAt: '2000-10-31',
}
const future: ClosingPeriodView = {
  id: 'p-99',
  name: 'Dezembro',
  startingAt: '2999-12-01',
  endingAt: '2999-12-31',
}
const movement = { id: 'm-1', name: 'Conta de luz' }

async function render(
  suggested: ClosingPeriodView | null = future,
  targets: ClosingPeriodView[] = [past, future],
) {
  const wrapper = mount(MoveMovementDialog, {
    props: { movement: null, targets, suggested, loading: false },
    attachTo: document.body,
    global: { plugins: createTestPlugins().plugins },
  })
  await wrapper.setProps({ movement })
  await flushPromises()
  return wrapper
}

function confirmButton() {
  return [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
    (button) => button.textContent?.trim() === 'Mover',
  )!
}

describe('MoveMovementDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('names the movement, marks the expired periods and starts on the suggested one', async () => {
    const wrapper = await render()

    expect(document.body.textContent).toContain('Mover “Conta de luz”')
    const select = wrapper.findComponent(FilterSelect)
    expect(select.props('modelValue')).toBe('p-99')
    expect(select.props('options')).toEqual([
      { value: 'p-10', label: 'Outubro · expirado' },
      { value: 'p-99', label: 'Dezembro' },
    ])
  })

  it('shows the server errors inside the dialog and nothing without them', async () => {
    const wrapper = await render()
    expect(document.body.querySelector('[data-slot="server-error"]')).toBeNull()

    await wrapper.setProps({ messages: ['Mova-o de volta'] })

    expect(
      document.body.querySelector('[role="dialog"] [data-slot="server-error"]')!.textContent,
    ).toContain('Mova-o de volta')
  })

  it('moves to the chosen period', async () => {
    const wrapper = await render()

    wrapper.findComponent(FilterSelect).vm.$emit('update:modelValue', 'p-10')
    await flushPromises()
    confirmButton().click()
    await flushPromises()

    expect(wrapper.emitted('confirm')![0]).toEqual([movement, past])
  })

  it('starts on the first target when no period is suggested', async () => {
    const wrapper = await render(null)

    expect(wrapper.findComponent(FilterSelect).props('modelValue')).toBe('p-10')
    expect(confirmButton().disabled).toBe(false)
  })

  it('cannot move without a period', async () => {
    await render(null, [])

    expect(confirmButton().disabled).toBe(true)
  })

  it('does not take the focus from the field when Cancelar is pressed', async () => {
    await render()
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })

    const cancel = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Cancelar',
    )!
    cancel.dispatchEvent(press)

    expect(press.defaultPrevented).toBe(true)
  })

  it('asks to close with Escape', async () => {
    const wrapper = await render()

    document
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
