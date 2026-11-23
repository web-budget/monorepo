import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ModuleHome from '@/components/layout/ModuleHome.vue'
import {
  configurationSection,
  financialSection,
  type ModuleSectionDefinition,
} from '@/components/layout/sections'
import { createTestPlugins } from '@/test/mounting'

function render(section: ModuleSectionDefinition, counts: Record<string, number | null> = {}) {
  const { plugins } = createTestPlugins()
  return mount(ModuleHome, {
    props: { section, description: 'module-home.description.configuration', counts },
    global: { plugins },
  })
}

describe('ModuleHome', () => {
  it('shows the module title and description', () => {
    const wrapper = render(configurationSection)

    expect(wrapper.find('[data-slot="page-title"]').text()).toBe('Configurações')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Contas de usuários, áreas de acesso e integrações.',
    )
  })

  it('links the card of each menu item that has a screen, with icon, name and phrase', () => {
    const wrapper = render(configurationSection)

    const link = wrapper.find('a[data-slot="module-card"]')
    expect(link.attributes('href')).toBe('/configuration/users')
    expect(link.text()).toContain('Usuários')
    expect(link.text()).toContain('Contas, áreas de acesso e aprovações.')
    expect(link.find('svg').exists()).toBe(true)
  })

  it('shows the count of the card in a mono span', () => {
    const wrapper = render(configurationSection, { '/configuration/users': 6 })

    const count = wrapper.find('[data-slot="module-card-count"]')
    expect(count.text()).toBe('6')
    expect(count.classes()).toContain('font-mono')
  })

  it('shows a zero count', () => {
    const wrapper = render(configurationSection, { '/configuration/users': 0 })

    expect(wrapper.find('[data-slot="module-card-count"]').text()).toBe('0')
  })

  it.each([
    ['is not loaded yet', {}],
    ['failed', { '/configuration/users': null }],
  ])('shows the card without a count when the count %s', (_case, counts) => {
    const wrapper = render(configurationSection, counts)

    expect(wrapper.find('[data-slot="module-card-count"]').exists()).toBe(false)
    expect(wrapper.find('a[data-slot="module-card"]').text()).toContain('Usuários')
  })

  it('dims an item without a screen, makes it unclickable and tags it as coming soon', () => {
    const wrapper = render(configurationSection)

    const disabled = wrapper
      .findAll('[data-slot="module-card"]')
      .find((card) => card.text().includes('Integrações'))!
    expect(disabled.element.tagName).toBe('DIV')
    expect(disabled.attributes('aria-disabled')).toBe('true')
    expect(disabled.classes()).toContain('opacity-60')
    expect(disabled.text()).toContain('Em breve')
    expect(disabled.text()).toContain('Conexões com bancos e serviços externos.')
    expect(wrapper.findAll('a[data-slot="module-card"]')).toHaveLength(1)
  })

  it('shows the financial items without a screen as coming soon', () => {
    const wrapper = render(financialSection)

    expect(wrapper.findAll('a')).toHaveLength(6)
    const cards = wrapper.findAll('[aria-disabled="true"]')
    expect(cards).toHaveLength(1)
    expect(cards.every((card) => card.text().includes('Em breve'))).toBe(true)
  })

  it('lays the cards out on an auto-fill grid of at least 320px', () => {
    const wrapper = render(configurationSection)

    expect(wrapper.html()).toContain('grid-cols-[repeat(auto-fill,minmax(320px,1fr))]')
  })
})
