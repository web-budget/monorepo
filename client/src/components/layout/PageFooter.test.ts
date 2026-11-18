import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PageFooter from '@/components/layout/PageFooter.vue'

describe('PageFooter', () => {
  it('links to the project site and shows the app version', () => {
    const wrapper = mount(PageFooter)

    expect(wrapper.find('a').attributes('href')).toBe('https://webbudget.com.br')
    expect(wrapper.find('a').attributes('rel')).toBe('noopener noreferrer')
    expect(wrapper.text()).toContain(`v${__APP_VERSION__}`)
  })
})
