import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cardsApi } from '@/api/cards'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { importsApi } from '@/api/imports'
import { walletsApi } from '@/api/wallets'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import { buttonWithText, mountView, pageOf, problem } from '@/test/crud'
import type {
  CardListView,
  FinancialPeriodListView,
  ImportCounts,
  ImportListView,
  ImportQuery,
  WalletListView,
} from '@/types'
import ImportListScreen from '@/views/financial/imports/ImportListView.vue'

vi.mock('@/api/imports')
vi.mock('@/api/cards')
vi.mock('@/api/wallets')
vi.mock('@/api/financialPeriods')

const period = { id: 'p-11', name: 'Novembro de 2026', status: 'OPEN', expired: false }
const visa = { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '4821' }
const checking = { id: 'w-1', name: 'Conta corrente' }

function entry(overrides: Partial<ImportListView>): ImportListView {
  return {
    id: 'i-1',
    fileName: 'fatura-visa-novembro.ofx',
    target: 'CARD',
    card: visa,
    financialPeriod: period,
    status: 'READY',
    lines: 16,
    pending: 4,
    createdOn: '2026-11-26T09:02:00',
    ...overrides,
  } as ImportListView
}

const items = [
  entry({}),
  entry({ id: 'i-2', status: 'PROCESSING', lines: 0, pending: 0 }),
  entry({ id: 'i-3', status: 'FAILED', lines: 0, pending: 0, error: 'invalid-ofx-file' }),
  entry({
    id: 'i-4',
    status: 'SAVED',
    lines: 8,
    pending: 0,
    target: 'WALLET',
    card: undefined,
    wallet: checking,
  }),
  entry({ id: 'i-5', status: 'READY', lines: 3, pending: 0 }),
]

const counts: ImportCounts = { processing: 1, ready: 2, failed: 1, saved: 1, undone: 0, total: 5 }
const EMPTY_COUNTS: ImportCounts = {
  processing: 0,
  ready: 0,
  failed: 0,
  saved: 0,
  undone: 0,
  total: 0,
}

const periods = [
  period,
  { id: 'p-9', name: 'Setembro de 2026', status: 'CLOSED', expired: false },
] as FinancialPeriodListView[]

const wallets = [
  { id: 'w-1', name: 'Conta corrente', type: 'BANK_ACCOUNT' },
  { id: 'w-2', name: 'Carteira física', type: 'PERSONAL' },
] as WalletListView[]

function serve(content = items, total = content.length, totals = counts) {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(periods))
  vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf([visa] as CardListView[]))
  vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf(wallets))
  vi.mocked(importsApi.findAll).mockResolvedValue(pageOf(content, total))
  vi.mocked(importsApi.counts).mockResolvedValue(totals)
}

function lastQuery(): ImportQuery {
  return vi.mocked(importsApi.findAll).mock.calls.slice(-1)[0]![0]
}

async function render(location?: string, content = items, total = content.length, totals = counts) {
  serve(content, total, totals)
  return mountView(ImportListScreen, 'imports', {}, {}, location)
}

describe('ImportListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('opens on the ready imports, with the counts of every tab', async () => {
    const { wrapper, router } = await render()

    expect(wrapper.find('h1').text()).toBe('Importações')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Arquivos OFX da fatura e do extrato, conferidos antes de salvar.',
    )
    expect(lastQuery()).toMatchObject({
      statuses: ['READY'],
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
    expect(router.currentRoute.value.query).toEqual({})
    expect(wrapper.findAll('[data-slot="status-count"]').map((count) => count.text())).toEqual([
      '2',
      '1',
      '1',
      '1',
      '0',
      '5',
    ])
    expect(wrapper.find('input[type="search"]').attributes('placeholder')).toBe(
      'Nome do arquivo, cartão ou carteira',
    )
  })

  it('shows the file, the destination, the period, the lines, the date and the status', async () => {
    const { wrapper } = await render()

    expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual([
      'Arquivo',
      'Destino',
      'Período',
      'Linhas',
      'Enviada em',
      'Situação',
    ])
    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(5)
    expect(rows[0]!.findAll('td').map((cell) => cell.text())).toEqual([
      'fatura-visa-novembro.ofx',
      'Visa Platinum ••4821',
      'Novembro de 2026',
      '16 · 4 a resolver',
      '26/11/2026 09:02',
      'Pronta',
    ])
    expect(rows[1]!.find('td:nth-child(4)').text()).toBe('—')
    expect(rows[1]!.text()).toContain('Processando')
    expect(rows[2]!.find('td:nth-child(4)').text()).toBe('—')
    expect(rows[3]!.find('td:nth-child(2)').text()).toBe('Conta corrente')
    expect(rows[3]!.find('td:nth-child(4)').text()).toBe('8')
    expect(rows[4]!.find('td:nth-child(4)').text()).toBe('3')
    expect(rows.map((row) => row.attributes('data-state'))).toEqual([
      'selected',
      undefined,
      'selected',
      undefined,
      'selected',
    ])
    expect(wrapper.text()).toContain('1–5 de 5 importações')
  })

  it('has the create button in the header', async () => {
    const { wrapper, router } = await render()

    expect(
      wrapper
        .find('[data-slot="page-actions"]')
        .findAll('button')
        .map((button) => button.text()),
    ).toEqual(['Criar'])

    await buttonWithText(wrapper, 'Criar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('imports.create')
  })

  it('opens with the state of the URL, which stays there', async () => {
    const location =
      '/imports?status=SAVED&destination=wallet:w-1&period=p-9&filter=extrato&sort=name,asc'

    const { router } = await render(location)

    expect(lastQuery()).toEqual({
      filter: 'extrato',
      statuses: ['SAVED'],
      card: undefined,
      wallet: 'w-1',
      financialPeriod: 'p-9',
      page: 0,
      size: 15,
      sort: 'name,asc',
    })
    expect(router.currentRoute.value.fullPath).toBe(location)
  })

  it('offers the active cards and the wallets that have a statement as the destination', async () => {
    const { wrapper } = await render()
    const [destination, period_] = wrapper.findAllComponents(FilterSelect)

    expect(destination!.props('options')).toEqual([
      { value: 'card:c-1', label: 'Visa Platinum ••4821' },
      { value: 'wallet:w-1', label: 'Conta corrente' },
    ])
    expect(period_!.props('options')).toEqual([
      { value: 'p-11', label: 'Novembro de 2026' },
      { value: 'p-9', label: 'Setembro de 2026 · encerrado' },
    ])
  })

  it('reloads with each filter, with the tabs and with the search', async () => {
    const { wrapper, router } = await render()
    const [destination, period_] = wrapper.findAllComponents(FilterSelect)

    destination!.vm.$emit('update:modelValue', 'card:c-1')
    await flushPromises()
    expect(lastQuery().card).toBe('c-1')
    expect(router.currentRoute.value.query.destination).toBe('card:c-1')

    period_!.vm.$emit('update:modelValue', 'p-9')
    await flushPromises()
    expect(lastQuery().financialPeriod).toBe('p-9')

    await buttonWithText(wrapper, 'Salvas').trigger('click')
    await flushPromises()
    expect(lastQuery().statuses).toEqual(['SAVED'])

    await wrapper.find('input[type="search"]').setValue('visa')
    await wrapper.find('form[role="search"]').trigger('submit')
    await flushPromises()
    expect(lastQuery().filter).toBe('visa')
  })

  it('reloads when the search text is cleared with the X', async () => {
    const { wrapper } = await render('/imports?filter=visa')

    await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()

    expect(lastQuery().filter).toBeUndefined()
  })

  it('clears only the destination and the period with the clear button', async () => {
    const { wrapper } = await render('/imports?destination=card:c-1&period=p-9&status=SAVED')

    await buttonWithText(wrapper, 'Limpar').trigger('click')
    await flushPromises()

    expect(lastQuery()).toMatchObject({
      card: undefined,
      financialPeriod: undefined,
      statuses: ['SAVED'],
    })
    expect(buttonWithText(wrapper, 'Limpar').attributes('disabled')).toBeDefined()
  })

  it('sorts, goes to the next page and opens the detail from the row', async () => {
    const { wrapper, router } = await render(undefined, items, 40)

    await buttonWithText(wrapper, 'Arquivo').trigger('click')
    await flushPromises()
    expect(lastQuery().sort).toBe('name,asc')

    await buttonWithText(wrapper, 'Período').trigger('click')
    await flushPromises()
    expect(lastQuery().sort).toBe('period,asc')

    await wrapper.find('button[aria-label="Próxima página"]').trigger('click')
    await flushPromises()
    expect(lastQuery()).toMatchObject({ page: 1, size: 15 })

    await wrapper.findAll('tbody tr')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('imports.detail')
    expect(router.currentRoute.value.params.id).toBe('i-1')
  })

  it('shows the empty state of an empty list and goes to the form from it', async () => {
    const { wrapper, router } = await render(undefined, [], 0, EMPTY_COUNTS)
    const empty = wrapper.find('[data-state="empty"]')

    expect(empty.text()).toContain('Nenhuma importação ainda')
    expect(empty.text()).toContain('Envie o OFX da fatura de um cartão ou do extrato de uma conta.')

    await empty.find('button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('imports.create')
  })

  it('says there is no result, without the create button, when imports exist but the tab is empty', async () => {
    const { wrapper } = await render(undefined, [])

    expect(wrapper.find('[data-state="empty"]').exists()).toBe(false)
    const noResult = wrapper.find('[data-state="no-result"]')
    expect(noResult.text()).toContain('Nenhuma importação com esses filtros')
    expect(noResult.text()).not.toContain('Nenhuma importação ainda')
    expect(noResult.text()).not.toContain('Criar')
  })

  it('names the last tab in the feminine', async () => {
    const { wrapper } = await render()

    const tabs = wrapper
      .findAll('button')
      .filter((button) => button.find('[data-slot="status-count"]').exists())
      .map((button) => button.text().replace(/\d+$/, '').trim())

    expect(tabs.slice(-1)[0]).toBe('Todas')
  })

  it('says there is no result for a search or for the filters, and clears them', async () => {
    const { wrapper } = await render('/imports?filter=zzz', [])
    const withQuery = wrapper.find('[data-state="no-result"]')

    expect(withQuery.text()).toContain('Nenhuma importação encontrada para “zzz”')

    await withQuery.find('button').trigger('click')
    await flushPromises()

    expect(lastQuery()).toMatchObject({ filter: undefined, statuses: undefined })

    vi.mocked(importsApi.findAll).mockResolvedValue(pageOf([]))
    await buttonWithText(wrapper, 'Salvas').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-state="no-result"]').text()).toContain(
      'Nenhuma importação com esses filtros',
    )
  })

  it('shows the error state and retries', async () => {
    serve()
    vi.mocked(importsApi.findAll).mockRejectedValue(problem(500))
    const { wrapper } = await mountView(ImportListScreen, 'imports')
    const error = wrapper.find('[data-state="error"]')

    expect(error.text()).toContain('Não foi possível carregar as importações')

    vi.mocked(importsApi.findAll).mockResolvedValue(pageOf(items))
    await error.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-state="error"]').exists()).toBe(false)
  })

  it('shows the server error when the options cannot be loaded', async () => {
    serve()
    vi.mocked(cardsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(ImportListScreen, 'imports')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })

  it('leaves the counts out when they cannot be read', async () => {
    serve()
    vi.mocked(importsApi.counts).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(ImportListScreen, 'imports')
    await flushPromises()

    expect(wrapper.find('[data-slot="status-count"]').exists()).toBe(false)
  })
})
