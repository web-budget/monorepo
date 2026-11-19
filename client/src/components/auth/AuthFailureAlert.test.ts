import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthFailureAlert from '@/components/auth/AuthFailureAlert.vue'

describe('AuthFailureAlert', () => {
  it('shows the title and the description', () => {
    const wrapper = mount(AuthFailureAlert, {
      props: { title: 'Muitas tentativas', description: 'Espere um pouco.' },
    })

    expect(wrapper.text()).toContain('Muitas tentativas')
    expect(wrapper.text()).toContain('Espere um pouco.')
    expect(wrapper.find('[data-slot="step-failure"]').exists()).toBe(true)
  })

  it('uses the timer icon for a rate limit and the alert icon otherwise', () => {
    const rateLimit = mount(AuthFailureAlert, {
      props: { title: 't', description: 'd', rateLimit: true },
    })
    const other = mount(AuthFailureAlert, { props: { title: 't', description: 'd' } })

    expect(rateLimit.find('svg.lucide-timer').exists()).toBe(true)
    expect(other.find('svg.lucide-circle-alert').exists()).toBe(true)
  })
})
