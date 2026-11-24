import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GoogleNotice from '@/components/account/GoogleNotice.vue'
import { createTestPlugins } from '@/test/mounting'

describe('GoogleNotice', () => {
  it('says the account signs in with Google, naming the Google account', () => {
    const { plugins } = createTestPlugins({
      initialState: { auth: { session: { email: 'maria@exemplo.com.br' } } },
    })

    const wrapper = mount(GoogleNotice, { global: { plugins } })

    expect(wrapper.text()).toContain('Você entra com o Google')
    expect(wrapper.text()).toContain(
      'Esta conta não tem senha no webBudget: o acesso é pela conta Google maria@exemplo.com.br. A senha e a verificação em duas etapas são as do Google.',
    )
  })
})
