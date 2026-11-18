import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PasswordRequirements from '@/components/auth/PasswordRequirements.vue'
import { createTestPlugins } from '@/test/mounting'

function render(password: string) {
  return mount(PasswordRequirements, {
    props: { password },
    global: { plugins: createTestPlugins().plugins },
  })
}

describe('PasswordRequirements', () => {
  it('lists every requirement as pending for an empty password', () => {
    const items = render('').findAll('li')

    expect(items).toHaveLength(3)
    expect(items.map((item) => item.attributes('data-met'))).toEqual(['false', 'false', 'false'])
    expect(items[0]?.text()).toContain('pendente')
  })

  it('marks the requirements that are met', () => {
    const items = render('Caderno').findAll('li')

    expect(items.map((item) => item.attributes('data-met'))).toEqual(['false', 'true', 'false'])
    expect(items[1]?.text()).toContain('atendido')
  })
})
