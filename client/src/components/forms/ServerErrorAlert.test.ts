import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'

describe('ServerErrorAlert', () => {
  it('renders nothing without messages', () => {
    expect(
      mount(ServerErrorAlert, { props: { messages: [] } })
        .find('[role="alert"]')
        .exists(),
    ).toBe(false)
  })

  it('lists every message in an alert', () => {
    const wrapper = mount(ServerErrorAlert, { props: { messages: ['First', 'Second'] } })

    expect(
      wrapper
        .find('[role="alert"]')
        .findAll('li')
        .map((item) => item.text()),
    ).toEqual(['First', 'Second'])
  })
})
