import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import ActionButtons from '@/components/listing/ActionButtons.vue'
import i18n from '@/locales'

function render() {
  return mount(ActionButtons, { attachTo: document.body, global: { plugins: [i18n] } })
}

async function openMenu(wrapper: ReturnType<typeof render>) {
  await wrapper.find('button[aria-label="Mais ações"]').trigger('keydown', { key: 'Enter' })
  await flushPromises()
}

function menuItem(label: string) {
  const item = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  if (!item) {
    throw new Error(`no menu item "${label}"`)
  }
  return item
}

describe('ActionButtons', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('offers the edit and remove actions in a menu', async () => {
    const wrapper = render()

    expect(document.body.querySelector('[role="menu"]')).toBeNull()
    await openMenu(wrapper)

    expect(menuItem('Editar')).toBeDefined()
    expect(menuItem('Remover')).toBeDefined()
  })

  it('emits onEdit when Editar is chosen', async () => {
    const wrapper = render()
    await openMenu(wrapper)

    menuItem('Editar').click()
    await flushPromises()

    expect(wrapper.emitted('onEdit')).toHaveLength(1)
    expect(wrapper.emitted('onDelete')).toBeUndefined()
  })

  it('emits onDelete when Remover is chosen', async () => {
    const wrapper = render()
    await openMenu(wrapper)

    menuItem('Remover').click()
    await flushPromises()

    expect(wrapper.emitted('onDelete')).toHaveLength(1)
    expect(wrapper.emitted('onEdit')).toBeUndefined()
  })
})
