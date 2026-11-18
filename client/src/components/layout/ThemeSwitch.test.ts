import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ThemeSwitch from '@/components/layout/ThemeSwitch.vue'
import { useAppearanceStore } from '@/stores/appearance'
import { createTestPlugins } from '@/test/mounting'

function render(props: Record<string, unknown> = {}) {
  const { plugins } = createTestPlugins({ initialState: { appearance: { mode: 'system' } } })
  return mount(ThemeSwitch, { props, global: { plugins: plugins as never[] } })
}

describe('ThemeSwitch', () => {
  it('shows the three themes as radios with their names and marks the current one', () => {
    const wrapper = render()

    const radios = wrapper.findAll('[role="radio"]')
    expect(radios.map((radio) => radio.text())).toEqual(['Claro', 'Escuro', 'Sistema'])
    expect(radios.map((radio) => radio.attributes('aria-checked'))).toEqual([
      'false',
      'false',
      'true',
    ])
    expect(wrapper.find('[role="radiogroup"]').attributes('aria-label')).toBe('Tema')
  })

  it('shows only icons, still named for assistive technology, when icon only', () => {
    const wrapper = render({ iconOnly: true })

    const radios = wrapper.findAll('[role="radio"]')
    expect(radios.map((radio) => radio.text())).toEqual(['', '', ''])
    expect(radios.map((radio) => radio.attributes('aria-label'))).toEqual([
      'Claro',
      'Escuro',
      'Sistema',
    ])
  })

  it('sets the chosen mode', async () => {
    const wrapper = render()

    await wrapper.findAll('[role="radio"]')[1]!.trigger('click')

    expect(useAppearanceStore().setMode).toHaveBeenCalledWith('dark')
  })
})
