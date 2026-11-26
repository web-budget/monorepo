import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import UnlinkedRecurringDialog from '@/components/imports/UnlinkedRecurringDialog.vue'
import { Dialog } from '@/components/ui/dialog'
import { createTestPlugins } from '@/test/mounting'
import type { ImportCandidateView } from '@/types'

const items = [
  {
    kind: 'MOVEMENT',
    id: 'm-9',
    name: 'Internet',
    value: 120,
    financialPeriod: { id: 'p-11', name: 'Novembro de 2026' },
    recurring: true,
  },
  { kind: 'MOVEMENT', id: 'm-8', name: 'Academia', value: 90, recurring: true },
] as ImportCandidateView[]

function render() {
  const { plugins } = createTestPlugins()
  return mount(UnlinkedRecurringDialog, {
    props: { open: true, items },
    attachTo: document.body,
    global: { plugins },
  })
}

describe('UnlinkedRecurringDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('lists the recurrings with the period when they have one', async () => {
    render()
    await flushPromises()

    const rows = Array.from(document.body.querySelectorAll('[data-slot="unlinked-list"] li')).map(
      (row) => row.textContent?.replace(/\s/g, ' '),
    )
    expect(rows).toEqual(['InternetEm aberto, NovembroR$ 120,00', 'AcademiaEm abertoR$ 90,00'])
  })

  it('asks to close from the button and from the dialog itself', async () => {
    const wrapper = render()
    await flushPromises()

    const close = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Fechar',
    )!
    close.click()
    wrapper.findComponent(Dialog).vm.$emit('update:open', false)

    expect(wrapper.emitted('close')).toHaveLength(2)
  })
})
