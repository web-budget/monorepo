import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LanguageSwitch from '@/components/layout/LanguageSwitch.vue'
import { useLanguageStore } from '@/stores/language'
import { createTestPlugins } from '@/test/mounting'

function render() {
  const { plugins } = createTestPlugins()
  return mount(LanguageSwitch, { global: { plugins: plugins as never[] } })
}

describe('LanguageSwitch', () => {
  it('shows the two languages as radios named in full and marks the current one', () => {
    const wrapper = render()

    const radios = wrapper.findAll('[role="radio"]')
    expect(radios.map((radio) => radio.text())).toEqual(['pt-BR', 'en-US'])
    expect(radios.map((radio) => radio.attributes('aria-label'))).toEqual([
      'Português (Brasil)',
      'Inglês (Estados Unidos)',
    ])
    expect(radios.map((radio) => radio.attributes('aria-checked'))).toEqual(['true', 'false'])
    expect(wrapper.find('[role="radiogroup"]').attributes('aria-label')).toBe('Idioma')
  })

  it('selects the chosen language', async () => {
    const wrapper = render()

    await wrapper.findAll('[role="radio"]')[1]!.trigger('click')

    expect(useLanguageStore().select).toHaveBeenCalledWith('en-US')
  })
})
