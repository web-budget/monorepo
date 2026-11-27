import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ImportLineBadges from '@/components/imports/ImportLineBadges.vue'
import { createTestPlugins } from '@/test/mounting'
import type { ImportLineView } from '@/types'

function render(
  overrides: Partial<ImportLineView> = {},
  props: { hideInstallment?: boolean; memoryLabel?: boolean } = {},
) {
  const { plugins } = createTestPlugins()
  return mount(ImportLineBadges, {
    props: {
      ...props,
      line: {
        id: 'l-1',
        value: -100,
        alreadyImported: false,
        alreadyRegistered: false,
        fromMemory: false,
        differentValue: false,
        ...overrides,
      } as ImportLineView,
    },
    global: { plugins },
  })
}

describe('ImportLineBadges', () => {
  it('shows nothing for a line with nothing to tell', () => {
    expect(render().find('[data-slot="line-badges"]').text()).toBe('')
  })

  it('tells where the line comes from and what it is', () => {
    const text = render({
      fromMemory: true,
      alreadyImported: true,
      alreadyRegistered: true,
      installment: 3,
      installments: 10,
      ignoreReason: { code: 'credit' },
    }).text()

    expect(text).toContain('Sugerida pela memória')
    expect(text).toContain('Já importada')
    expect(text).toContain('Já registrada')
    expect(text).toContain('Crédito sem compra')
    expect(text).toContain('3/10')
  })

  it('hides the installment badge when asked to', () => {
    const wrapper = render({ installment: 3, installments: 10 }, { hideInstallment: true })

    expect(wrapper.text()).not.toContain('3/10')
    expect(wrapper.find('[data-slot="line-badges"]').text()).toBe('')
  })

  it('writes out the memory as a badge when asked to, and as an icon otherwise', () => {
    const labelled = render({ fromMemory: true }, { memoryLabel: true })
    const icon = render({ fromMemory: true })

    expect(labelled.find('[data-slot="line-memory"]').text()).toBe('Sugerida pela memória')
    expect(labelled.find('[data-slot="line-memory"]').classes()).toContain('inline-flex')
    expect(icon.find('[data-slot="line-memory"]').find('.sr-only').text()).toBe(
      'Sugerida pela memória',
    )
  })

  it('does not warn about a credit when the line is ignored for another reason', () => {
    expect(render({ ignoreReason: { code: 'iof-pair' } }).text()).not.toContain(
      'Crédito sem compra',
    )
  })

  it('shows the difference to the linked entry with the sign only when negative', () => {
    const more = render({ differentValue: true, link: { value: 60 } as never })
    const less = render({
      differentValue: true,
      value: 50,
      link: { value: 60 } as never,
    })

    expect(more.text().replace(/\s/g, ' ')).toContain('Diferença de R$ 40,00')
    expect(less.text().replace(/\s/g, ' ')).toContain('Diferença de −R$ 10,00')
  })
})
