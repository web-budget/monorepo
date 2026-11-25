import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import ClosePeriodDialog from '@/components/periods/ClosePeriodDialog.vue'
import { createTestPlugins } from '@/test/mounting'
import type { FinancialPeriodResultView } from '@/types'

const result: FinancialPeriodResultView = {
  revenues: 8400,
  expenses: 5279.45,
  result: 3120.55,
  recorded: false,
  toPay: 0,
  overdueExpenses: 0,
}

async function render(shown: FinancialPeriodResultView | null = result) {
  const wrapper = mount(ClosePeriodDialog, {
    props: { open: true, name: 'Outubro de 2026', result: shown, loading: false },
    attachTo: document.body,
    global: { plugins: createTestPlugins().plugins },
  })
  await flushPromises()
  return wrapper
}

function summary() {
  return document.body
    .querySelector('[data-slot="close-summary"]')!
    .textContent!.split(String.fromCharCode(160))
    .join(' ')
}

describe('ClosePeriodDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('shows revenues, expenses and the result without sign, painting by tone', async () => {
    await render()

    expect(document.body.textContent).toContain('Fechar Outubro de 2026?')
    expect(summary()).toBe('Receitas8.400,00Despesas5.279,45Resultado3.120,55')
    const colors = [
      ...document.body.querySelectorAll('[data-slot="close-summary"] [data-slot="currency"]'),
    ].map((element) => element.getAttribute('data-direction'))
    expect(colors).toEqual(['income', 'expense', null])
  })

  it('shows only a negative result with the minus sign and in red', async () => {
    await render({ ...result, revenues: 100, expenses: 400, result: -300 })

    expect(summary()).toContain('Resultado−300,00')
    const resultValue = document.body.querySelectorAll(
      '[data-slot="close-summary"] [data-slot="currency"]',
    )[2]!
    expect(resultValue.getAttribute('data-direction')).toBe('expense')
  })

  it('shows the server errors at the top of the body', async () => {
    const wrapper = await render()
    expect(document.body.querySelector('[data-slot="server-error"]')).toBeNull()

    await wrapper.setProps({ messages: ['O período ainda tem movimentos em aberto'] })

    expect(document.body.querySelector('[data-slot="server-error"]')!.textContent).toContain(
      'O período ainda tem movimentos em aberto',
    )
  })

  it('shows no summary without a result', async () => {
    await render(null)

    expect(document.body.querySelector('[data-slot="close-summary"]')).toBeNull()
  })

  it('confirms and cancels', async () => {
    const wrapper = await render()
    const buttons = [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]

    buttons.find((button) => button.textContent?.trim() === 'Fechar período')!.click()
    buttons.find((button) => button.textContent?.trim() === 'Cancelar')!.click()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
