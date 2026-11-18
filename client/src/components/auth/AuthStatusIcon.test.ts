import { mount } from '@vue/test-utils'
import { Hourglass } from 'lucide-vue-next'
import { describe, expect, it } from 'vitest'
import AuthStatusIcon from '@/components/auth/AuthStatusIcon.vue'

describe('AuthStatusIcon', () => {
  it.each([
    ['accent', 'bg-accent'],
    ['attention', 'bg-highlight'],
    ['success', 'bg-income-muted'],
    ['danger', 'bg-expense-muted'],
  ] as const)('draws the icon in the %s tone', (tone, background) => {
    const wrapper = mount(AuthStatusIcon, { props: { icon: Hourglass, tone } })

    expect(wrapper.classes()).toContain(background)
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
