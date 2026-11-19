import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthStepHeader from '@/components/auth/AuthStepHeader.vue'

describe('AuthStepHeader', () => {
  it('renders the title and the description', () => {
    const wrapper = mount(AuthStepHeader, {
      props: { title: 'Entrar' },
      slots: { default: 'Texto' },
    })

    expect(wrapper.find('h1').text()).toBe('Entrar')
    expect(wrapper.find('p').text()).toBe('Texto')
  })

  it('omits the description when there is none', () => {
    const wrapper = mount(AuthStepHeader, { props: { title: 'Entrar' } })

    expect(wrapper.find('p').exists()).toBe(false)
  })
})
