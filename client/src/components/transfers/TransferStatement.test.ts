import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TransferStatement from '@/components/transfers/TransferStatement.vue'
import { createTestPlugins } from '@/test/mounting'

function render(props: Omit<InstanceType<typeof TransferStatement>['$props'], 'title'>) {
  const { plugins } = createTestPlugins()
  return mount(TransferStatement, {
    props: { title: 'Extrato da transferência', ...props },
    global: { plugins },
  })
}

describe('TransferStatement', () => {
  it('shows the title with today and a block per wallet', () => {
    const wrapper = render({
      from: { name: 'Conta corrente', balance: 1000 },
      to: { name: 'Poupança', balance: 50 },
      value: 500,
    })

    expect(wrapper.text()).toContain('Extrato da transferência')
    expect(wrapper.text()).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    expect(wrapper.find('aside').attributes('aria-label')).toBe('Extrato da transferência')
    expect(wrapper.find('[data-side="from"] p').text()).toBe('Conta corrente')
    expect(wrapper.find('[data-side="to"] p').text()).toBe('Poupança')
  })

  it('shows the debit and the credit with the balances before and after', () => {
    const wrapper = render({
      from: { name: 'Conta corrente', balance: 1000 },
      to: { name: 'Poupança', balance: 50 },
      value: 500,
    })

    const from = wrapper.find('[data-side="from"]').text()
    const to = wrapper.find('[data-side="to"]').text()
    expect(from).toMatch(/Saldo anterior\s*R\$\s1\.000,00/)
    expect(from).toMatch(/Débito\s*−R\$\s500,00/)
    expect(from).toMatch(/Saldo posterior\s*R\$\s500,00/)
    expect(to).toMatch(/Crédito\s*\+R\$\s500,00/)
    expect(to).toMatch(/Saldo posterior\s*R\$\s550,00/)
  })

  it('leaves the balances out while they are unknown or the wallet is not chosen', () => {
    const wrapper = render({
      from: { name: 'Conta corrente', balance: null },
      to: null,
      value: 0,
    })

    expect(wrapper.find('[data-side="from"]').text()).not.toMatch(/Saldo anterior\s*R\$/)
    expect(wrapper.find('[data-side="to"]').text()).toContain('---')
  })
})
