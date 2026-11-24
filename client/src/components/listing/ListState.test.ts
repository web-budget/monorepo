import { mount } from '@vue/test-utils'
import { Wallet } from 'lucide-vue-next'
import { describe, expect, it } from 'vitest'
import ListState, { type ListStateKind } from '@/components/listing/ListState.vue'
import i18n from '@/locales'

function render(props: {
  kind: ListStateKind
  query?: string
  message?: string
  creatable?: boolean
  outlineAction?: boolean
  copy?: { emptyAction?: string }
}) {
  return mount(ListState, {
    props: { entity: 'wallet', icon: Wallet, ...props },
    global: { plugins: [i18n] },
  })
}

describe('ListState', () => {
  it('invites the user to create the first record when the list is empty', async () => {
    const wrapper = render({ kind: 'empty' })

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.text()).toContain('Nenhuma carteira ainda')
    expect(wrapper.text()).toContain('Os lançamentos sempre saem de uma carteira.')

    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Criar')
    expect(wrapper.emitted('create')).toHaveLength(1)
    expect(wrapper.emitted('clear')).toBeUndefined()
    expect(wrapper.emitted('retry')).toBeUndefined()
  })

  it('hides the create action of an empty list that cannot create', () => {
    const wrapper = render({ kind: 'empty', creatable: false })

    expect(wrapper.text()).toContain('Nenhuma carteira ainda')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('keeps the retry action of an error list that cannot create', () => {
    const wrapper = render({ kind: 'error', creatable: false })

    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('names the search that found nothing and offers to clear it', async () => {
    const wrapper = render({ kind: 'no-result', query: 'poupanca' })

    expect(wrapper.text()).toContain('Nada encontrado para “poupanca”')
    expect(wrapper.text()).toContain('Confira a grafia')

    await wrapper.find('button').trigger('click')

    expect(wrapper.find('button').text()).toBe('Limpar busca')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('offers to show everything when only the status filter found nothing', () => {
    const wrapper = render({ kind: 'no-result' })

    expect(wrapper.text()).toContain('Nada encontrado neste filtro')
    expect(wrapper.find('button').text()).toBe('Mostrar todos')
  })

  it('explains the failure with the server message and offers to try again', async () => {
    const wrapper = render({ kind: 'error', message: 'O servidor não respondeu.' })

    expect(wrapper.attributes('role')).toBe('alert')
    expect(wrapper.text()).toContain('Não foi possível carregar as carteiras')
    expect(wrapper.text()).toContain('O servidor não respondeu.')

    await wrapper.find('button').trigger('click')

    expect(wrapper.find('button').text()).toBe('Tentar de novo')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('falls back to a generic message when the server said nothing', () => {
    const wrapper = render({ kind: 'error' })

    expect(wrapper.text()).toContain('Confira sua conexão e tente de novo.')
  })
  it('can name the action of an empty list and show it as a small outline button without the plus', () => {
    const wrapper = render({ kind: 'empty', outlineAction: true, copy: { emptyAction: 'Novo' } })

    const button = wrapper.find('button')
    expect(button.text()).toBe('Novo')
    expect(button.attributes('data-variant')).toBe('outline')
    expect(button.attributes('data-size')).toBe('sm')
    expect(button.find('svg').exists()).toBe(false)
  })
})
