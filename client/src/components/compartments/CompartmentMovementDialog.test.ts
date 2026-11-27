import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import CompartmentMovementDialog, {
  type MovementRequest,
} from '@/components/compartments/CompartmentMovementDialog.vue'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { settle } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type { CompartmentView } from '@/types'

const emergency: CompartmentView = {
  id: 'k-1',
  name: 'Emergency',
  type: 'RESERVE',
  balance: 1000,
  statementEntryCount: 0,
  achieved: false,
  overdue: false,
}

const stocks: CompartmentView = { ...emergency, id: 'k-2', name: 'Stocks', balance: 50 }

async function render(request: MovementRequest | null, props: Record<string, unknown> = {}) {
  installZodErrorMap()
  const { plugins } = createTestPlugins()
  const wrapper = mount(CompartmentMovementDialog, {
    props: {
      request: null,
      walletName: 'Main',
      freeBalance: 100,
      compartments: [emergency, stocks],
      loading: false,
      messages: [],
      fieldErrors: {},
      ...props,
    },
    attachTo: document.body,
    global: { plugins },
  })
  await wrapper.setProps({ request })
  await flushPromises()
  return wrapper
}

function input(name: string) {
  return document.body.querySelector<HTMLInputElement>(`[name="${name}"]`)!
}

async function type(name: string, value: string) {
  const element = input(name)
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('blur'))
  await flushPromises()
}

async function submit() {
  document.body.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
  await settle()
}

function summary() {
  return document.body.querySelector('[data-slot="movement-summary"]')!.textContent!
}

function button(text: string) {
  return [...document.body.querySelectorAll('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
}

describe('CompartmentMovementDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('stays closed without a request', async () => {
    await render(null)

    expect(document.body.querySelector('form')).toBeNull()
  })

  it('opens with the direction and the piggy bank chosen, showing the free balance and the piggy bank', async () => {
    await render({ direction: 'DEPOSIT', compartmentId: 'k-1' })

    expect(document.body.textContent).toContain('Guardar ou resgatar')
    expect(document.body.textContent).toContain('Guardar em')
    expect(summary()).toMatch(/Saldo livre\s*100,00/)
    expect(summary()).toMatch(/Emergency\s*1\.000,00/)
  })

  it('shows the free balance and the piggy bank before and after a deposit', async () => {
    await render({ direction: 'DEPOSIT', compartmentId: 'k-1' })

    await type('value', '3000')

    expect(input('value').value).toBe('30,00')
    expect(summary()).toMatch(/Saldo livre\s*100,00\s*70,00/)
    expect(summary()).toMatch(/Emergency\s*1\.000,00\s*1\.030,00/)
    expect(document.body.querySelector('[data-slot="negative-notice"]')).toBeNull()
  })

  it('warns when the free balance turns negative, but still lets it be confirmed', async () => {
    const wrapper = await render({ direction: 'DEPOSIT', compartmentId: 'k-1' })

    await type('value', '15000')

    expect(summary()).toMatch(/−50,00/)
    expect(document.body.querySelector('[data-slot="negative-notice"]')!.textContent).toContain(
      'O saldo livre fica negativo',
    )

    await submit()

    expect(wrapper.emitted('move')![0]).toEqual([
      'k-1',
      { direction: 'DEPOSIT', value: 150, note: null },
    ])
  })

  it('shows the withdrawal that passes the balance as an error under the value and blocks it', async () => {
    const wrapper = await render({ direction: 'WITHDRAWAL', compartmentId: 'k-2' })

    expect(document.body.textContent).toContain('Resgatar de')

    await type('value', '8000')

    expect(document.body.querySelector('[role="alert"]')!.textContent).toMatch(
      /O resgate passa do saldo de Stocks, que é 50,00\./,
    )
    expect(
      document.body.querySelector('button[type="submit"]')!.hasAttribute('disabled'),
    ).toBe(true)
    expect(summary()).not.toContain('→')

    await submit()

    expect(wrapper.emitted('move')).toBeUndefined()
  })

  it('withdraws what fits with the note, with the value prefilled by the request', async () => {
    const wrapper = await render({ direction: 'WITHDRAWAL', compartmentId: 'k-2', value: 50 })

    expect(input('value').value).toBe('50,00')
    expect(summary()).toMatch(/Saldo livre\s*100,00\s*150,00/)
    expect(summary()).toMatch(/Stocks\s*50,00\s*0,00/)

    await type('note', 'Back')
    await submit()

    expect(wrapper.emitted('move')![0]).toEqual([
      'k-2',
      { direction: 'WITHDRAWAL', value: 50, note: 'Back' },
    ])
    expect(document.body.textContent).toContain('4/150')
  })

  it('asks for the piggy bank and the value before moving anything', async () => {
    const wrapper = await render({ direction: 'DEPOSIT' })

    expect(summary()).not.toContain('Emergency')

    await submit()

    expect(wrapper.emitted('move')).toBeUndefined()
    expect(document.body.textContent).toContain('Campo obrigatório')
  })

  it('shows the errors of the server under the value and at the top of the dialog', async () => {
    const wrapper = await render({ direction: 'DEPOSIT', compartmentId: 'k-1' })

    await wrapper.setProps({
      fieldErrors: { value: 'O valor precisa ser maior que zero.' },
      messages: ['Algo mais'],
    })
    await flushPromises()

    expect(document.body.textContent).toContain('O valor precisa ser maior que zero.')
    expect(document.body.querySelector('[data-slot="server-error"]')!.textContent).toContain(
      'Algo mais',
    )
  })

  it('switches the direction and closes from the cancel button', async () => {
    const wrapper = await render({ direction: 'DEPOSIT', compartmentId: 'k-1' })

    const withdraw = [...document.body.querySelectorAll('button[aria-pressed]')].find(
      (candidate) => candidate.textContent?.trim() === 'Resgatar',
    )!
    withdraw.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(document.body.textContent).toContain('Resgatar de')

    button('Cancelar')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
