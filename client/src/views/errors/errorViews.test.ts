import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createTestPlugins } from '@/test/mounting'
import ForbiddenView from '@/views/errors/ForbiddenView.vue'
import NotFoundView from '@/views/errors/NotFoundView.vue'
import ServerErrorView from '@/views/errors/ServerErrorView.vue'

describe('error views', () => {
  it.each([
    ['ForbiddenView', ForbiddenView, '403', 'Não autorizado', 'Você não tem permissão'],
    ['NotFoundView', NotFoundView, '404', 'Não encontrado', 'O recurso solicitado não existe'],
    ['ServerErrorView', ServerErrorView, '500', 'Falha no servidor', 'Tente novamente mais tarde'],
  ])('%s shows its code, its explanation and a way home', (_name, view, code, detail, hint) => {
    const { plugins } = createTestPlugins({
      routes: [{ path: '/home', name: 'home', component: { render: () => null } }],
    })
    const wrapper = mount(view, { global: { plugins } })

    expect(wrapper.text()).toContain(code)
    expect(wrapper.find('h1').text()).toBe(detail)
    expect(wrapper.text()).toContain(hint)
    expect(wrapper.find('a').text()).toBe('Ir para home')
  })
})
