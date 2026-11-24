import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PreferencesTab from '@/components/account/PreferencesTab.vue'
import { useLanguageStore } from '@/stores/language'
import { createTestPlugins } from '@/test/mounting'
import { settle } from '@/test/settle'

function render() {
  const { plugins } = createTestPlugins()
  return mount(PreferencesTab, { attachTo: document.body, global: { plugins } })
}

describe('PreferencesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('offers a card for each language by its own name, with the code in mono', () => {
    const wrapper = render()

    const cards = wrapper.findAll('[role="radio"]')
    expect(cards.map((card) => card.text())).toEqual(['Português (Brasil)pt-BR', 'Englishen-US'])
    expect(cards.map((card) => card.attributes('aria-checked'))).toEqual(['true', 'false'])
    expect(wrapper.text()).toContain(
      'Vale para a interface e para os e-mails, em qualquer navegador.',
    )
    expect(wrapper.text()).not.toContain('Tema')
    expect(wrapper.find('[data-slot="saved"]').exists()).toBe(false)
  })

  it('applies the chosen language and says it was saved to the profile', async () => {
    const wrapper = render()
    vi.mocked(useLanguageStore().select).mockResolvedValue()

    await wrapper.findAll('[role="radio"]')[1]!.trigger('click')
    await settle()

    expect(useLanguageStore().select).toHaveBeenCalledWith('en-US')
    expect(wrapper.get('[data-slot="saved"]').text()).toBe('Salvo no seu perfil.')
  })

  it('does not say it saved when the server refuses', async () => {
    const wrapper = render()
    vi.mocked(useLanguageStore().select).mockRejectedValue(new Error('refused'))

    await wrapper.findAll('[role="radio"]')[1]!.trigger('click')
    await settle()

    expect(wrapper.find('[data-slot="saved"]').exists()).toBe(false)
  })
})
