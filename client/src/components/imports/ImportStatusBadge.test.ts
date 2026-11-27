import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ImportStatusBadge from '@/components/imports/ImportStatusBadge.vue'
import { createTestPlugins } from '@/test/mounting'
import type { ImportStatus } from '@/types'

describe('ImportStatusBadge', () => {
  it.each([
    ['PROCESSING', 'Processando', true],
    ['READY', 'Pronta', true],
    ['FAILED', 'Com erro', true],
    ['SAVED', 'Salva', false],
    ['UNDONE', 'Desfeita', true],
  ] as [ImportStatus, string, boolean][])('says %s as "%s"', (status, text, hasIcon) => {
    const wrapper = mount(ImportStatusBadge, {
      props: { status },
      global: { plugins: createTestPlugins().plugins },
    })

    expect(wrapper.text()).toBe(text)
    expect(wrapper.find('svg').exists()).toBe(hasIcon)
  })
})
