import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ImportLineResult from '@/components/imports/ImportLineResult.vue'
import { createTestPlugins } from '@/test/mounting'
import type { ImportCandidateView, ImportLineView } from '@/types'

function render(overrides: Partial<ImportLineView>) {
  const { plugins } = createTestPlugins()
  return mount(ImportLineResult, {
    props: {
      periodId: 'p-11',
      target: 'CARD',
      line: { id: 'l-1', value: -10, action: 'LINK', ...overrides } as ImportLineView,
    },
    global: { plugins },
  })
}

function target(periodId: string, name = 'Seguro de vida') {
  return {
    kind: 'MOVEMENT',
    id: 'm-1',
    name,
    financialPeriod: { id: periodId, name: 'Outubro de 2026' },
  } as ImportCandidateView
}

describe('ImportLineResult', () => {
  it('names the period of a linked entry only when it is not the one of the import', () => {
    expect(render({ link: target('p-10') }).text()).toBe(
      'Vinculada a “Seguro de vida” de Outubro, paga no cartão',
    )
    expect(render({ link: target('p-11') }).text()).toBe('Vinculada a “Seguro de vida”, paga no cartão')
  })

  it('tells the date a line was already imported', () => {
    const wrapper = render({
      action: 'IGNORE',
      ignoreReason: { code: 'already-imported', date: '2026-10-05' },
    })

    expect(wrapper.text()).toBe('Já importada em 05/10/2026')
  })

  it('shows an ignored line in the muted tone with the reason', () => {
    const wrapper = render({ action: 'IGNORE', ignoreReason: { code: 'already-registered' } })

    expect(wrapper.text()).toBe('Já registrada')
    expect(wrapper.find('[data-slot="line-result"]').classes()).toContain('text-muted-foreground')
  })
})
