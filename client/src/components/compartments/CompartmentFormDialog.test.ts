import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { Dialog } from '@/components/ui/dialog'
import CompartmentFormDialog from '@/components/compartments/CompartmentFormDialog.vue'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { settle } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { CompartmentView } from '@/types'

const trip: CompartmentView = {
  id: 'k-1',
  name: 'Trip',
  type: 'GOAL',
  balance: 100,
  statementEntryCount: 0,
  achieved: false,
  overdue: false,
  description: 'Beach',
  targetValue: 1800,
  targetDate: '2027-02-10',
}

const reserve: CompartmentView = { ...trip, id: 'k-2', name: 'Emergency', type: 'RESERVE' }

async function render(props: Record<string, unknown> = {}) {
  installZodErrorMap()
  const { plugins } = createTestPlugins()
  const wrapper = mount(CompartmentFormDialog, {
    props: {
      open: true,
      walletName: 'Main',
      compartment: null,
      loading: false,
      messages: [],
      fieldErrors: {},
      ...props,
    },
    attachTo: document.body,
    global: { plugins },
  })
  await flushPromises()
  return wrapper
}

function input(name: string) {
  return document.body.querySelector<HTMLInputElement>(`[name="${name}"]`)
}

async function type(name: string, value: string) {
  const element = input(name)!
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('blur'))
  await flushPromises()
}

async function submit() {
  document.body.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
  await settle()
}

describe('CompartmentFormDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('stays closed while it is not open', async () => {
    await render({ open: false })

    expect(document.body.querySelector('form')).toBeNull()
  })

  it('asks for the name and the type of a new piggy bank, without the goal fields', async () => {
    await render()

    expect(document.body.textContent).toContain('Criar cofrinho')
    expect(document.body.textContent).toContain('Escolher')
    expect(input('name')).not.toBeNull()
    expect(input('description')).toBeNull()
    expect(input('targetDate')).toBeNull()
    expect(document.body.querySelector('[role="combobox"]')!.hasAttribute('disabled')).toBe(false)
  })

  it('does not submit an empty form and shows what is missing', async () => {
    const wrapper = await render()

    await submit()

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(document.body.textContent).toContain('Campo obrigatório')
  })

  it('shows the goal fields of a goal with the type locked and submits the edition', async () => {
    const wrapper = await render({ compartment: trip })

    expect(document.body.textContent).toContain('Editar Trip')
    expect(document.body.querySelector('[role="combobox"]')!.hasAttribute('disabled')).toBe(true)
    expect(input('name')!.value).toBe('Trip')
    expect(input('description')!.value).toBe('Beach')
    expect(input('targetDate')!.value).toBe('2027-02-10')
    expect(document.body.textContent).toContain('5/150')

    await type('name', 'Big trip')
    await type('description', 'Abroad')
    await submit()

    expect(wrapper.emitted('submit')![0]![0]).toMatchObject({
      name: 'Big trip',
      type: 'GOAL',
      description: 'Abroad',
      targetValue: 1800,
      targetDate: '2027-02-10',
    })
  })

  it('does not show the goal fields of a reserve', async () => {
    await render({ compartment: reserve })

    expect(document.body.textContent).toContain('Editar Emergency')
    expect(input('description')).toBeNull()
  })

  it('shows a goal fresh from the server with no goal data as empty fields', async () => {
    await render({
      compartment: { ...trip, description: null, targetValue: null, targetDate: null },
    })

    expect(input('description')!.value).toBe('')
    expect(input('targetDate')!.value).toBe('')
  })

  it('shows the errors the server gave for the fields and the ones of the dialog', async () => {
    const wrapper = await render({ compartment: trip })

    await wrapper.setProps({
      fieldErrors: { targetDate: 'A data alvo não pode ser anterior a hoje.' },
      messages: ['Algo mais'],
    })
    await flushPromises()

    expect(document.body.textContent).toContain('A data alvo não pode ser anterior a hoje.')
    expect(document.body.querySelector('[data-slot="server-error"]')!.textContent).toContain(
      'Algo mais',
    )
  })

  it('clears the form when it switches to a new piggy bank and keeps focus on the name', async () => {
    const wrapper = await render({ compartment: reserve })
    await type('name', 'Changed')

    await wrapper.setProps({ compartment: null })
    await flushPromises()

    expect(input('name')!.value).toBe('')
    expect(document.activeElement).toBe(input('name'))
  })

  it('emits close from the cancel button', async () => {
    const wrapper = await render()

    const cancel = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Cancelar',
    )!
    cancel.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('closes when the dialog asks to and does not take the focus from the field on cancel', async () => {
    const wrapper = await render()

    const cancel = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Cancelar',
    )!
    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    cancel.dispatchEvent(press)
    wrapper.getComponent(Dialog).vm.$emit('update:open', false)

    expect(press.defaultPrevented).toBe(true)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
