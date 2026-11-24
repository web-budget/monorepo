import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cardsApi } from '@/api/cards'
import { financialPeriodsApi } from '@/api/financialPeriods'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import { mountView, pageOf, problem, settle } from '@/test/crud'
import type { CardListView, FinancialPeriodListView } from '@/types'
import InvoiceImportView from '@/views/financial/invoices/InvoiceImportView.vue'

vi.mock('@/api/cards')
vi.mock('@/api/financialPeriods')

const periods = [
  {
    id: 'p-11',
    name: 'Novembro',
    startingAt: '2026-11-01',
    endingAt: '2026-11-30',
    status: 'OPEN',
  },
  { id: 'p-10', name: 'Outubro', startingAt: '2026-10-01', endingAt: '2026-10-31', status: 'OPEN' },
  {
    id: 'p-09',
    name: 'Setembro',
    startingAt: '2026-09-01',
    endingAt: '2026-09-30',
    status: 'CLOSED',
  },
] as FinancialPeriodListView[]

const cards = [
  { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '4821' },
  { id: 'c-2', name: 'Master', lastFourDigits: '1177' },
] as CardListView[]

function serve(periodList = periods, cardList = cards) {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(periodList))
  vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf(cardList))
}

async function render(location?: string) {
  serve()
  return mountView(InvoiceImportView, 'invoices', {}, {}, location)
}

describe('InvoiceImportView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
  })

  it('shows the shell of the import: the title, the three steps with the first one current and the recent imports', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('Importar fatura')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Envie o CSV ou OFX, classifique e salve.',
    )
    const steps = wrapper.findAll('[data-slot="steps"] li')
    expect(steps.map((step) => step.text())).toEqual(['1 Envio', '2 Processando', '3 Rascunho'])
    expect(steps[0]!.classes()).toContain('font-semibold')
    expect(steps[1]!.classes()).toContain('text-muted-foreground')
    expect(wrapper.find('[data-slot="recent"]').text()).toContain('Importações recentes')
    expect(wrapper.find('[data-slot="recent"]').text()).toContain('Nenhuma importação ainda.')
  })

  it('has the upload area with the formats, and nothing to send yet', async () => {
    const { wrapper } = await render()

    const upload = wrapper.find('[data-slot="upload"]')
    expect(upload.text()).toContain('Arraste o arquivo da fatura ou clique para escolher')
    expect(upload.text()).toContain('CSV ou OFX, até 5 MB.')
    expect(upload.text()).toContain('A fatura do cartão precisa estar aberta neste período.')
    expect(upload.find('input[type="file"]').attributes('accept')).toBe('.csv,.ofx')
    expect(upload.find('input[type="file"]').attributes('disabled')).toBeDefined()
    const send = upload.findAll('button').find((button) => button.text() === 'Enviar arquivo')!
    expect(send.attributes('disabled')).toBeDefined()
  })

  it('starts on the first active card and on the period that contains today', async () => {
    const { wrapper } = await render()

    const selects = wrapper.findAllComponents(FilterSelect)
    expect(selects[0]!.props('modelValue')).toBe('c-1')
    expect(selects[0]!.props('options')).toEqual([
      { value: 'c-1', label: 'Visa Platinum ••4821' },
      { value: 'c-2', label: 'Master ••1177' },
    ])
    expect(selects[1]!.props('modelValue')).toBe('p-11')
    expect(selects[1]!.props('options')).toEqual([
      { value: 'p-11', label: 'Novembro' },
      { value: 'p-10', label: 'Outubro' },
    ])
  })

  it('lets the user choose another card and period', async () => {
    const { wrapper } = await render()

    const selects = wrapper.findAllComponents(FilterSelect)
    selects[0]!.vm.$emit('update:modelValue', 'c-2')
    selects[1]!.vm.$emit('update:modelValue', 'p-10')
    await settle()

    expect(selects[0]!.props('modelValue')).toBe('c-2')
    expect(selects[1]!.props('modelValue')).toBe('p-10')
  })

  it('starts from the card and the period of the link', async () => {
    const { wrapper } = await render('/invoices/import?card=c-2&period=p-10')

    const selects = wrapper.findAllComponents(FilterSelect)
    expect(selects[0]!.props('modelValue')).toBe('c-2')
    expect(selects[1]!.props('modelValue')).toBe('p-10')
  })

  it('starts empty when there is no active card and no open period', async () => {
    serve([], [])

    const { wrapper } = await mountView(InvoiceImportView, 'invoices')

    const selects = wrapper.findAllComponents(FilterSelect)
    expect(selects[0]!.props('modelValue')).toBe('')
    expect(selects[1]!.props('modelValue')).toBe('')
  })

  it('shows the server error when the options cannot be loaded', async () => {
    serve()
    vi.mocked(cardsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(InvoiceImportView, 'invoices')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })
})
