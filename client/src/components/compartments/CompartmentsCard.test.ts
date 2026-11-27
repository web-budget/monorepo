import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import CompartmentsCard from '@/components/compartments/CompartmentsCard.vue'
import { createTestPlugins } from '@/test/mounting'
import type { CompartmentView } from '@/types'

const reserve: CompartmentView = {
  id: 'k-1',
  name: 'Emergency',
  type: 'RESERVE',
  balance: 1000,
  statementEntryCount: 0,
  achieved: false,
  overdue: false,
}

function render(compartments: CompartmentView[] = [reserve], walletActive = true) {
  const { plugins } = createTestPlugins()
  return mount(CompartmentsCard, {
    props: { compartments, walletActive },
    attachTo: document.body,
    global: { plugins },
  })
}

async function chooseMenuItem(wrapper: ReturnType<typeof render>, label: string) {
  await wrapper
    .find('button[aria-label="Mais ações de Emergency"]')
    .trigger('keydown', { key: 'Enter' })
  await flushPromises()
  const item = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )!
  item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}

describe('CompartmentsCard', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('emits every action of the menu of a piggy bank with its id', async () => {
    const wrapper = render()

    await chooseMenuItem(wrapper, 'Guardar')
    await chooseMenuItem(wrapper, 'Resgatar')
    await chooseMenuItem(wrapper, 'Ver histórico')
    await chooseMenuItem(wrapper, 'Editar')
    await chooseMenuItem(wrapper, 'Excluir')

    expect(wrapper.emitted('deposit')![0]).toEqual(['k-1'])
    expect(wrapper.emitted('withdraw')![0]).toEqual(['k-1'])
    expect(wrapper.emitted('history')![0]).toEqual(['k-1'])
    expect(wrapper.emitted('edit')![0]).toEqual(['k-1'])
    expect(wrapper.emitted('remove')![0]).toEqual(['k-1'])
  })

  it('emits the actions of the header without a piggy bank', async () => {
    const wrapper = render()

    const buttons = wrapper.findAll('[data-slot="compartments-card"] > div:first-child button')
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    await buttons[2]!.trigger('click')

    expect(wrapper.emitted('deposit')![0]).toEqual([])
    expect(wrapper.emitted('withdraw')![0]).toEqual([])
    expect(wrapper.emitted('create')).toHaveLength(1)
  })

  it('creates from the empty state of an active wallet', async () => {
    const wrapper = render([])

    await wrapper.find('[data-slot="compartments-empty"] button').trigger('click')

    expect(wrapper.emitted('create')).toHaveLength(1)
  })

  it('keeps the history of an inactive wallet open and blocks the rest', async () => {
    const wrapper = render([reserve], false)

    await wrapper
      .find('button[aria-label="Mais ações de Emergency"]')
      .trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const items = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')]
    const disabled = items
      .filter((item) => item.hasAttribute('data-disabled'))
      .map((item) => item.textContent?.trim())
    expect(disabled).toEqual(['Guardar', 'Resgatar', 'Editar', 'Excluir'])
  })

  it('does not open the history when the menu button of the row is clicked', async () => {
    const wrapper = render()

    await wrapper.find('button[aria-label="Mais ações de Emergency"]').trigger('click')

    expect(wrapper.emitted('history')).toBeUndefined()
  })
})
