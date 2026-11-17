import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import ActionButtons from '@/components/listing/ActionButtons.vue'
import i18n from '@/locales'

function render() {
  return mount(ActionButtons, { global: { plugins: [i18n] } })
}

describe('ActionButtons', () => {
  it('emits onEdit when the edit button is clicked', async () => {
    const wrapper = render()

    await wrapper.find('button[aria-label="Editar"]').trigger('click')

    expect(wrapper.emitted('onEdit')).toHaveLength(1)
    expect(wrapper.emitted('onDelete')).toBeUndefined()
  })

  it('emits onDelete when the delete button is clicked', async () => {
    const wrapper = render()

    await wrapper.find('button[aria-label="Deletar"]').trigger('click')

    expect(wrapper.emitted('onDelete')).toHaveLength(1)
    expect(wrapper.emitted('onEdit')).toBeUndefined()
  })

  it('does not let a click bubble up to a clickable row', async () => {
    const rowClick = vi.fn<() => void>()
    const wrapper = mount(
      { render: () => h('div', { onClick: rowClick }, [h(ActionButtons)]) },
      { global: { plugins: [i18n] } },
    )

    await wrapper.find('button[aria-label="Editar"]').trigger('click')
    await wrapper.find('button[aria-label="Deletar"]').trigger('click')

    expect(rowClick).not.toHaveBeenCalled()
  })
})

describe('ActionButtons tooltips', () => {
  it('names each action in a tooltip when its button is focused', async () => {
    const wrapper = mount(ActionButtons, { attachTo: document.body, global: { plugins: [i18n] } })

    await wrapper.find('button[aria-label="Editar"]').trigger('focus')
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe('Editar')

    await wrapper.find('button[aria-label="Editar"]').trigger('blur')
    await wrapper.find('button[aria-label="Deletar"]').trigger('focus')
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe('Deletar')
  })
})
