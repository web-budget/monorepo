import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import LanguageMenu from '@/components/layout/LanguageMenu.vue'
import { useLanguageStore } from '@/stores/language'
import { createTestPlugins } from '@/test/mounting'

function render() {
  const { plugins } = createTestPlugins()
  return mount(LanguageMenu, { attachTo: document.body, global: { plugins } })
}

async function open(wrapper: ReturnType<typeof render>) {
  wrapper
    .get('button')
    .element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  await flushPromises()
}

function options() {
  return [...document.body.querySelectorAll<HTMLElement>('[role="menuitemradio"]')]
}

describe('LanguageMenu', () => {
  beforeEach(() => {
    document.body.replaceChildren()
  })

  it('shows the current language by its own name on the button', () => {
    const wrapper = render()

    expect(wrapper.get('button').text()).toBe('Português (Brasil)')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Idioma')
  })

  it('lists each language by its own name with the code and marks the current one', async () => {
    const wrapper = render()
    await open(wrapper)

    expect(options().map((option) => option.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Português (Brasil)pt-BR',
      'Englishen-US',
    ])
    expect(options().map((option) => option.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
    ])
    expect(document.body.textContent).not.toContain('navegador')
  })

  it('selects the chosen language', async () => {
    const wrapper = render()
    await open(wrapper)

    options()[1]!.click()
    await flushPromises()

    expect(useLanguageStore().select).toHaveBeenCalledWith('en-US')
  })
})
