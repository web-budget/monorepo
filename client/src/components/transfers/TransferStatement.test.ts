import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TransferStatement from '@/components/transfers/TransferStatement.vue'
import { createTestPlugins } from '@/test/mounting'

function render(props: InstanceType<typeof TransferStatement>['$props']) {
  const { plugins } = createTestPlugins()
  return mount(TransferStatement, { props, global: { plugins } })
}

describe('TransferStatement', () => {
  it('shows the debit and the credit with the balances before and after', () => {
    const wrapper = render({
      from: { name: 'Conta corrente', balance: 1000 },
      to: { name: 'Poupança', balance: 50 },
      value: 500,
    })

    const from = wrapper.find('[data-side="from"]').text()
    const to = wrapper.find('[data-side="to"]').text()
    expect(from).toContain('Conta corrente')
    expect(from).toMatch(/Saldo anterior\s*R\$\s1\.000,00/)
    expect(from).toMatch(/−\sR\$\s500,00/)
    expect(from).toMatch(/Saldo depois\s*R\$\s500,00/)
    expect(to).toMatch(/\+\sR\$\s500,00/)
    expect(to).toMatch(/Saldo depois\s*R\$\s550,00/)
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
