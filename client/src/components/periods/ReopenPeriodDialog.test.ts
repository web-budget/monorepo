import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import ReopenPeriodDialog from '@/components/periods/ReopenPeriodDialog.vue'
import { createTestPlugins } from '@/test/mounting'

async function render(period: { name: string } | null = { name: 'Outubro de 2026' }) {
  const wrapper = mount(ReopenPeriodDialog, {
    props: { period, loading: false },
    attachTo: document.body,
    global: { plugins: createTestPlugins().plugins },
  })
  await flushPromises()
  return wrapper
}

function dialogButton(label: string) {
  return [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(
    (button) => button.textContent?.trim() === label,
  )!
}

describe('ReopenPeriodDialog', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('names the period and lists what reopening does', async () => {
    await render()

    const text = document.body.textContent
    expect(text).toContain('Reabrir Outubro de 2026?')
    expect(text).toContain('Só o último período encerrado pode ser reaberto.')
    expect(text).toContain('Apaga o resultado do período.')
    expect(text).toContain('Descongela movimentos, compras e faturas.')
    expect(text).toContain('Faturas fechadas à mão continuam fechadas.')
    expect(text).toContain('Faturas vazias voltam a ficar abertas.')
  })

  it('stays closed without a period', async () => {
    await render(null)

    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('confirms and cancels', async () => {
    const wrapper = await render()

    dialogButton('Reabrir período').click()
    dialogButton('Cancelar').click()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
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
