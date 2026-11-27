import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ImportLineDetail from '@/components/imports/ImportLineDetail.vue'
import { createTestPlugins } from '@/test/mounting'
import type { ImportCandidateView, ImportLineView } from '@/types'

function render(overrides: Partial<ImportLineView>) {
  const { plugins } = createTestPlugins()
  return mount(ImportLineDetail, {
    props: {
      periodId: 'p-11',
      line: { id: 'l-1', action: 'LINK', pending: [], ...overrides } as ImportLineView,
    },
    global: { plugins },
  })
}

function target(overrides: Partial<ImportCandidateView> = {}) {
  return { kind: 'MOVEMENT', id: 'm-1', name: 'Seguro de vida', value: 60, ...overrides } as never
}

describe('ImportLineDetail', () => {
  it('shows the linked entry without the period when it is the one of the import', () => {
    const wrapper = render({
      link: target({ financialPeriod: { id: 'p-11', name: 'Novembro de 2026' } as never }),
    })

    expect(wrapper.text()).toBe('Seguro de vida')
  })

  it('shows the linked entry with the month when it belongs to another period', () => {
    const wrapper = render({
      link: target({ financialPeriod: { id: 'p-10', name: 'Outubro de 2026' } as never }),
    })

    expect(wrapper.text()).toBe('Seguro de vida· Outubro')
  })

  it('shows the linked entry alone when it has no period', () => {
    expect(render({ link: target() }).text()).toBe('Seguro de vida')
  })

  it('joins the reasons that are missing', () => {
    const wrapper = render({ action: 'CREATE', pending: ['cost-center', 'classification', 'installments'] })

    expect(wrapper.find('[data-slot="line-missing"]').text()).toBe(
      'Falta centro de custo e classificação e parcelas',
    )
  })
})
