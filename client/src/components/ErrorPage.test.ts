import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import ErrorPage from '@/components/ErrorPage.vue'

describe('ErrorPage', () => {
  it('renders each of its slots', () => {
    const wrapper = mount(ErrorPage, {
      slots: {
        'error-title': () => '404',
        'error-detail': () => 'Not found',
        'error-description': () => 'Nothing here',
        action: () => h('button', 'Home'),
      },
    })

    expect(wrapper.find('span').text()).toBe('404')
    expect(wrapper.find('h1').text()).toBe('Not found')
    expect(wrapper.text()).toContain('Nothing here')
    expect(wrapper.find('button').text()).toBe('Home')
  })
})
