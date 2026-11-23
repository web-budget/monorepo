import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RecurringInstallments from '@/components/recurring/RecurringInstallments.vue'
import RecurringRowActions from '@/components/recurring/RecurringRowActions.vue'
import RecurringStatusBadge from '@/components/recurring/RecurringStatusBadge.vue'
import RecurringValueKindBadge from '@/components/recurring/RecurringValueKindBadge.vue'
import { chooseRowAction } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'

function plugins() {
  return { global: { plugins: createTestPlugins().plugins } }
}

describe('RecurringInstallments', () => {
  it('shows the launched installments with a progress bar', () => {
    const wrapper = mount(RecurringInstallments, {
      props: { recurringMovement: { installments: 12, launchedInstallments: 3 } },
      ...plugins(),
    })

    expect(wrapper.text()).toBe('3/12')
    expect(wrapper.find('[data-slot="installments-bar"]').attributes('style')).toContain('25%')
  })

  it('says indefinite when there is no deadline', () => {
    const wrapper = mount(RecurringInstallments, {
      props: { recurringMovement: { installments: null, launchedInstallments: null } },
      ...plugins(),
    })

    expect(wrapper.text()).toBe('Indeterminado')
  })
})

describe('RecurringStatusBadge', () => {
  it.each([
    [true, false, 'Ativo'],
    [false, false, 'Inativo'],
    [true, true, 'Encerrado'],
  ])('labels active %s and finished %s as %s', (active, finished, label) => {
    const wrapper = mount(RecurringStatusBadge, { props: { active, finished }, ...plugins() })

    expect(wrapper.text()).toBe(label)
  })
})

describe('RecurringValueKindBadge', () => {
  it('names the kind of value', () => {
    expect(
      mount(RecurringValueKindBadge, { props: { valueKind: 'FIXED' }, ...plugins() }).text(),
    ).toBe('Fixo')
    expect(
      mount(RecurringValueKindBadge, { props: { valueKind: 'VARIABLE' }, ...plugins() }).text(),
    ).toBe('Variável')
  })
})

describe('RecurringRowActions', () => {
  function menuItems() {
    return [...document.body.querySelectorAll('[role="menuitem"]')].map((item) =>
      item.textContent?.trim(),
    )
  }

  it('offers the readjustment only to the fixed one', async () => {
    document.body.replaceChildren()
    const fixed = mount(RecurringRowActions, {
      props: { valueKind: 'FIXED' },
      attachTo: document.body,
      ...plugins(),
    })
    await chooseRowAction(fixed, 0, 'Reajustar valor')
    expect(fixed.emitted('readjust')).toHaveLength(1)
    await chooseRowAction(fixed, 0, 'Detalhes')
    await chooseRowAction(fixed, 0, 'Editar')
    await chooseRowAction(fixed, 0, 'Excluir')
    expect(['details', 'edit', 'remove'].map((name) => fixed.emitted(name)?.length)).toEqual([
      1, 1, 1,
    ])
    fixed.unmount()

    document.body.replaceChildren()
    const variable = mount(RecurringRowActions, {
      props: { valueKind: 'VARIABLE' },
      attachTo: document.body,
      ...plugins(),
    })
    await variable.find('button').trigger('keydown', { key: 'Enter' })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(menuItems()).toEqual(['Detalhes', 'Editar', 'Excluir'])
  })
})
