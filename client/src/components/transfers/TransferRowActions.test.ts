import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import TransferRowActions from '@/components/transfers/TransferRowActions.vue'
import { createTestPlugins } from '@/test/mounting'

async function render(returnable: boolean) {
  const { plugins } = createTestPlugins()
  const wrapper = mount(TransferRowActions, {
    props: { returnable },
    attachTo: document.body,
    global: { plugins },
  })
  await wrapper.find('button').trigger('keydown', { key: 'Enter' })
  await flushPromises()
  return wrapper
}

function items() {
  return [...document.body.querySelectorAll('[role="menuitem"]')]
}

describe('TransferRowActions', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('offers the details and the give back of a transfer that can be returned', async () => {
    const wrapper = await render(true)

    expect(items().map((item) => item.textContent?.trim())).toEqual(['Ver detalhes', 'Devolver'])
    ;(items()[1] as HTMLElement).click()
    await flushPromises()

    expect(wrapper.emitted('give-back')).toHaveLength(1)
  })

  it('offers only the details of a transfer that cannot be returned', async () => {
    const wrapper = await render(false)

    expect(items().map((item) => item.textContent?.trim())).toEqual(['Ver detalhes'])
    ;(items()[0] as HTMLElement).click()
    await flushPromises()

    expect(wrapper.emitted('details')).toHaveLength(1)
  })
})
