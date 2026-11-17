import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import App from '@/App.vue'

describe('App', () => {
  it('renders the landing content', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('You did it!')
  })
})
