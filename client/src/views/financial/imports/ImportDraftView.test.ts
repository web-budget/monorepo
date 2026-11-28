import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { importsApi } from '@/api/imports'
import { walletsApi } from '@/api/wallets'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ImportBulkBar from '@/components/imports/ImportBulkBar.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import {
  buttonWithText,
  mountView,
  namedTestRoutes,
  pageOf,
  problem,
  useCompactViewport,
} from '@/test/crud'
import type {
  ClassificationListView,
  CostCenterListView,
  ImportAction,
  ImportLineQuery,
  ImportLineView,
  ImportView,
  WalletListView,
} from '@/types'
import ImportDraftScreen from '@/views/financial/imports/ImportDraftView.vue'

vi.mock('@/api/imports')
vi.mock('@/api/costCenters')
vi.mock('@/api/classifications')
vi.mock('@/api/wallets')

const period = { id: 'p-11', name: 'Novembro de 2026', status: 'OPEN', expired: false }
const visa = { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '4821' }
const checking = { id: 'w-1', name: 'Conta corrente' }
const personal = { id: 'cc-1', name: 'Pessoal', fullName: 'Pessoal' }
const groceries = { id: 'cl-1', name: 'Mercado', type: 'EXPENSE' as const }

const CARD_ACTIONS: ImportAction[] = [
  'CREATE',
  'LINK',
  'LAUNCH_RECURRING',
  'CREATE_RECURRING',
  'IGNORE',
]

function draft(overrides: Partial<ImportView> = {}): ImportView {
  return {
    id: 'i-1',
    fileName: 'fatura-visa-novembro.ofx',
    target: 'CARD',
    card: visa,
    financialPeriod: period,
    status: 'READY',
    createdOn: '2026-11-26T09:02:00',
    lastUpdate: '2026-11-26T14:32:00',
    totals: { lines: 6, pending: 2, ignored: 2, byAction: {} },
    result: { created: 0, linked: 0, recurring: 0, transfers: 0, compartments: 0, ignored: 0 },
    warnings: { unlinkedRecurring: [], fileTotal: 1000, afterSave: 1010, ignoredCredits: 50 },
    undoBlockers: [],
    ...overrides,
  } as ImportView
}

function line(overrides: Partial<ImportLineView> = {}): ImportLineView {
  return {
    id: 'l-1',
    position: 1,
    postedOn: '2026-11-02',
    value: -223.1,
    description: 'SUPERMERCADO BOA COMPRA',
    name: 'Supermercado Boa Compra',
    kind: 'PURCHASE',
    action: 'CREATE',
    allowedActions: CARD_ACTIONS,
    alreadyImported: false,
    alreadyRegistered: false,
    fromMemory: false,
    differentValue: false,
    created: [],
    pending: [],
    costCenter: personal,
    classification: groceries,
    ...overrides,
  }
}

const unlinked = {
  kind: 'MOVEMENT' as const,
  id: 'm-9',
  name: 'Internet',
  value: 120,
  financialPeriod: period,
  recurring: true,
}

const lines = [
  line({ fromMemory: true }),
  line({
    id: 'l-2',
    name: 'Posto Estrela',
    pending: ['cost-center', 'classification'],
    costCenter: undefined,
    classification: undefined,
  }),
  line({
    id: 'l-3',
    name: 'Seguro de vida',
    action: 'LINK',
    differentValue: true,
    link: {
      kind: 'MOVEMENT',
      id: 'm-1',
      name: 'Seguro de vida',
      value: 60,
      financialPeriod: { id: 'p-10', name: 'Outubro de 2026', status: 'CLOSED', expired: true },
      recurring: false,
    },
  }),
  line({
    id: 'l-4',
    name: 'Estorno loja',
    value: 50,
    action: 'IGNORE',
    allowedActions: ['IGNORE'],
    ignoreReason: { code: 'credit' },
  }),
  line({
    id: 'l-5',
    name: 'Curso de fotografia',
    action: 'CREATE_RECURRING',
    installment: 2,
    installments: 6,
    alreadyImported: true,
  }),
  line({
    id: 'l-6',
    name: 'Academia',
    action: 'LAUNCH_RECURRING',
    pending: ['link'],
    costCenter: undefined,
    classification: undefined,
    alreadyRegistered: true,
  }),
]

const costCenters = [{ id: 'cc-1', name: 'Pessoal', active: true }] as CostCenterListView[]
const classifications = [
  { id: 'cl-1', name: 'Mercado', type: 'EXPENSE', active: true },
  { id: 'cl-2', name: 'Freelas', type: 'INCOME', active: true },
] as ClassificationListView[]
const wallets = [
  { id: 'w-1', name: 'Conta corrente', type: 'BANK_ACCOUNT' },
  { id: 'w-2', name: 'Poupança', type: 'SAVINGS' },
] as WalletListView[]

function serve(item = draft(), content = lines, total = content.length) {
  vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf(costCenters))
  vi.mocked(classificationsApi.findAll).mockResolvedValue(pageOf(classifications))
  vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf(wallets))
  vi.mocked(importsApi.findById).mockResolvedValue(item)
  vi.mocked(importsApi.findLines).mockResolvedValue(pageOf(content, total))
}

function lastQuery(): ImportLineQuery {
  return vi.mocked(importsApi.findLines).mock.calls.slice(-1)[0]![1]
}

async function render(location?: string, item = draft(), content = lines, total = content.length) {
  serve(item, content, total)
  return mountView(
    ImportDraftScreen,
    'imports',
    { id: 'i-1' },
    {},
    location,
    namedTestRoutes('imports.draft'),
  )
}

type Rendered = Awaited<ReturnType<typeof render>>['wrapper']

function rowTexts(wrapper: Rendered) {
  return wrapper
    .findAll('tbody tr')
    .map((row) => row.findAll('td').map((cell) => cell.text().replace(/\s/g, ' ')))
}

function dialog() {
  return document.body.querySelector('[data-slot="line-dialog"]')
}

function dialogButton(text: string) {
  const button = Array.from(
    document.body.querySelectorAll('[data-slot="line-dialog"] button'),
  ).find((candidate) => candidate.textContent?.trim() === text)
  if (!button) {
    throw new Error(`no dialog button "${text}"`)
  }
  return button as HTMLButtonElement
}

describe('ImportDraftView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    useCompactViewport(false)
  })

  it('shows the file, the destination, the period, the send date and when it was saved', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('fatura-visa-novembro.ofx')
    expect(wrapper.find('[data-slot="import-status"]').text()).toBe('Pronta')
    expect(wrapper.text()).toContain('Visa Platinum ••4821')
    expect(wrapper.text()).toContain('Novembro de 2026')
    expect(wrapper.text()).toContain('enviada em 26/11/2026 09:02')
    expect(wrapper.find('[data-slot="saved-at"]').text()).toBe('Salvo às 14:32')
  })

  it('loads the cost center options in hierarchy order', async () => {
    await render()

    expect(costCentersApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'fullName,asc' }),
    )
  })

  it('falls back to the send time when nothing was updated yet', async () => {
    const { wrapper } = await render(undefined, draft({ lastUpdate: undefined }))

    expect(wrapper.find('[data-slot="saved-at"]').text()).toBe('Salvo às 09:02')
  })

  it('opens on the lines to resolve, ordered by date, with the counts of the tabs', async () => {
    const { wrapper, router } = await render()

    expect(lastQuery()).toMatchObject({ pending: true, actions: undefined, sort: 'postedOn,asc' })
    expect(router.currentRoute.value.query).toEqual({})
    expect(wrapper.findAll('[data-slot="status-count"]').map((count) => count.text())).toEqual([
      '2',
      '2',
      '6',
    ])
    expect(wrapper.find('input[type="search"]').attributes('placeholder')).toBe(
      'Nome ou descrição do banco',
    )
  })

  it('summarizes a card invoice in four cards', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('[data-slot="total-lines"]').text()).toBe('Linhas62 ignoradas')
    expect(wrapper.find('[data-slot="total-pending"]').text()).toBe('A resolver2')
    expect(wrapper.find('[data-slot="total-before"]').text().replace(/\s/g, ' ')).toContain(
      'Total do arquivo',
    )
    expect(wrapper.find('[data-slot="total-before"]').text().replace(/\s/g, ' ')).toContain(
      'R$ 1.000,00',
    )
    expect(wrapper.find('[data-slot="total-before"]').text().replace(/\s/g, ' ')).toContain(
      'Sem o pagamento recebido',
    )
    expect(wrapper.find('[data-slot="total-after"]').text().replace(/\s/g, ' ')).toContain(
      'Fatura depois de salvar',
    )
    expect(wrapper.find('[data-slot="total-after"]').text().replace(/\s/g, ' ')).toContain(
      'R$ 1.010,00',
    )
    expect(wrapper.find('[data-slot="total-after"]').text().replace(/\s/g, ' ')).toContain(
      'Diferença de R$ 10,00',
    )
    expect(wrapper.find('[data-slot="total-after"]').text().replace(/\s/g, ' ')).toContain(
      'R$ 50,00 em créditos ignorados',
    )
  })

  it('summarizes a wallet statement with the balance of the file and after saving', async () => {
    const { wrapper } = await render(
      undefined,
      draft({
        target: 'WALLET',
        card: undefined,
        wallet: checking,
        ledgerBalanceOn: '2026-11-23',
        totals: { lines: 3, pending: 0, ignored: 0, byAction: {} },
        warnings: {
          unlinkedRecurring: [],
          ledgerBalance: 2000,
          afterSave: 1500,
          ignoredCredits: 0,
        },
      }),
      [],
    )

    expect(wrapper.find('[data-slot="total-before"]').text().replace(/\s/g, ' ')).toContain(
      'Saldo do arquivo',
    )
    expect(wrapper.find('[data-slot="total-before"]').text().replace(/\s/g, ' ')).toContain(
      'Em 23/11/2026',
    )
    expect(wrapper.find('[data-slot="total-after"]').text().replace(/\s/g, ' ')).toContain(
      'Saldo depois de salvar',
    )
    expect(wrapper.find('[data-slot="total-after"]').text().replace(/\s/g, ' ')).toContain(
      'Diferença de −R$ 500,00',
    )
    expect(wrapper.find('[data-slot="total-after"]').text().replace(/\s/g, ' ')).not.toContain(
      'créditos',
    )
    expect(wrapper.find('[data-slot="total-pending"]').text()).toBe('A resolver0Tudo resolvido')
  })

  it('shows every line as a reading row with its action and the summary of the action', async () => {
    const { wrapper } = await render()

    expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual([
      '',
      'Data',
      'Nome',
      'Valor (R$)',
      'Ação',
      'Detalhe',
      'Editar',
    ])
    const rows = rowTexts(wrapper)
    expect(rows[0]).toEqual([
      '',
      '02/11',
      'Supermercado Boa CompraSugerida pela memória',
      '223,10',
      'Criar',
      'Pessoal · Mercado',
      '',
    ])
    expect(rows[1]![5]).toBe('Falta centro de custo e classificação')
    expect(rows[2]![2]).toBe('Seguro de vidaDiferença de R$ 163,10')
    expect(rows[2]![5]).toBe('Seguro de vida · Outubro')
    expect(rows[3]).toEqual([
      '',
      '02/11',
      'Estorno lojaCrédito sem compra',
      '50,00',
      'Ignorar',
      'Crédito do cartão',
      '',
    ])
    expect(rows[4]![2]).toBe('Curso de fotografiaJá importada2/6')
    expect(rows[4]![5]).toBe('2/6 · Pessoal · Mercado')
    expect(rows[5]![2]).toBe('AcademiaJá registrada')
    expect(rows[5]![5]).toBe('Falta o recorrente')
    expect(wrapper.findAll('tbody tr')[1]!.attributes('data-state')).toBe('selected')
    expect(wrapper.findAll('tbody tr')[0]!.attributes('data-state')).toBeUndefined()
    expect(
      wrapper
        .findAll('[data-slot="line-value"]')
        .map((value) => value.attributes('data-direction')),
    ).toEqual(['out', 'out', 'out', 'in', 'out', 'out'])
  })

  it('explains an ignored line by the reason', async () => {
    const { wrapper } = await render('/imports?status=IGNORED', draft(), [
      line({ id: 'l-1', action: 'IGNORE', ignoreReason: undefined }),
      line({
        id: 'l-2',
        action: 'IGNORE',
        ignoreReason: { code: 'already-imported', date: '2026-10-05' },
      }),
      line({ id: 'l-3', action: 'IGNORE', ignoreReason: { code: 'payment-received' } }),
    ])

    expect(rowTexts(wrapper).map((row) => row[5])).toEqual([
      'Ignorada por você',
      'Já importada em 05/10/2026',
      'Pagamento da fatura anterior',
    ])
  })

  it('shows the transfer of a wallet line and the dash of a line with no reason', async () => {
    const { wrapper } = await render(
      undefined,
      draft({ target: 'WALLET', card: undefined, wallet: checking }),
      [line({ action: 'TRANSFER', wallet: { id: 'w-2', name: 'Poupança' } })],
    )

    expect(rowTexts(wrapper)[0]![5]).toBe('Para Poupança')
  })

  it('shows the ignored lines and the whole file in the other tabs, with the tab in the URL', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Ignoradas').trigger('click')
    await flushPromises()

    expect(lastQuery()).toMatchObject({ pending: undefined, actions: ['IGNORE'] })
    expect(router.currentRoute.value.query).toEqual({ status: 'IGNORED' })

    await buttonWithText(wrapper, 'Todas').trigger('click')
    await flushPromises()

    expect(lastQuery()).toMatchObject({ pending: undefined, actions: undefined })
    expect(router.currentRoute.value.query).toEqual({ status: 'ALL' })
  })

  it('opens on the tab, the search and the page of the URL', async () => {
    await render('/imports?status=ALL&filter=posto&page=2&size=30')

    expect(lastQuery()).toMatchObject({ filter: 'posto', page: 1, size: 30 })
  })

  it('searches the name and the bank description', async () => {
    const { wrapper } = await render()

    await wrapper.find('input[type="search"]').setValue('posto')
    await wrapper.find('form[role="search"]').trigger('submit')
    await flushPromises()

    expect(lastQuery()).toMatchObject({ filter: 'posto', page: 0 })
  })

  it('clears the search with the button of the field', async () => {
    const { wrapper } = await render('/imports?status=ALL&filter=posto')

    await wrapper.find('[aria-label="Limpar filtro"]').trigger('click')
    await flushPromises()

    expect(lastQuery()).toMatchObject({ filter: undefined })
  })

  it('goes to another page and changes the page size', async () => {
    const { wrapper } = await render(undefined, draft(), lines, 40)

    await wrapper.find('[aria-label="Próxima página"]').trigger('click')
    await flushPromises()
    expect(lastQuery()).toMatchObject({ page: 1, size: 15 })
  })

  it('offers to see all the lines when none is left to resolve', async () => {
    const { wrapper } = await render(
      undefined,
      draft({ totals: { lines: 6, pending: 0, ignored: 2, byAction: {} } }),
      [],
    )

    expect(wrapper.find('[data-state="no-result"]').text()).toContain('Nenhuma linha a resolver')

    await buttonWithText(wrapper, 'Ver todas').trigger('click')
    await flushPromises()

    expect(lastQuery()).toMatchObject({ pending: undefined })
  })

  it('tells there is no ignored line', async () => {
    const { wrapper } = await render('/imports?status=IGNORED', draft(), [])

    expect(wrapper.find('[data-state="no-result"]').text()).toContain('Nenhuma linha ignorada')
  })

  it('clears the search that found nothing', async () => {
    const { wrapper } = await render('/imports?status=ALL&filter=xyz', draft(), [])

    expect(wrapper.find('[data-state="no-result"]').text()).toContain(
      'Nenhuma linha encontrada para “xyz”',
    )

    await buttonWithText(wrapper, 'Limpar busca').trigger('click')
    await flushPromises()

    expect(lastQuery()).toMatchObject({ filter: undefined })
  })

  it('shows the error of the server and tries again', async () => {
    serve()
    vi.mocked(importsApi.findLines).mockRejectedValueOnce(problem(500))
    const { wrapper } = await mountView(
      ImportDraftScreen,
      'imports',
      { id: 'i-1' },
      {},
      undefined,
      namedTestRoutes('imports.draft'),
    )

    expect(wrapper.find('[data-state="error"]').exists()).toBe(true)

    await buttonWithText(wrapper, 'Tentar de novo').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-state="error"]').exists()).toBe(false)
    expect(wrapper.findAll('tbody tr')).toHaveLength(6)
  })

  it('goes to the import when it is not a draft anymore', async () => {
    const { router } = await render(undefined, draft({ status: 'SAVED' }))

    expect(router.currentRoute.value.name).toBe('imports.detail')
    expect(importsApi.findLines).not.toHaveBeenCalled()
  })

  it('shows the recurrings that did not come in the file and lists them in a dialog', async () => {
    const { wrapper } = await render(
      undefined,
      draft({
        warnings: { unlinkedRecurring: [unlinked], afterSave: 1, ignoredCredits: 0 } as never,
      }),
    )

    expect(wrapper.find('[data-slot="unlinked-recurring"]').text()).toContain(
      '1 recorrente lançado não veio no arquivo',
    )

    await buttonWithText(wrapper, 'Ver lançamento').trigger('click')
    await flushPromises()

    const list = document.body.querySelector('[data-slot="unlinked-list"]')!
    expect(list.textContent).toContain('Internet')
    expect(list.textContent).toContain('Em aberto, Novembro')

    const close = Array.from(document.body.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Fechar',
    )!
    close.click()
    await flushPromises()
    expect(document.body.querySelector('[data-slot="unlinked-list"]')).toBeNull()
  })

  it('does not show the warning when every recurring came', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('[data-slot="unlinked-recurring"]').exists()).toBe(false)
  })

  it('names the lines left to resolve in the footer and blocks saving with the reason', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('[data-slot="draft-status"]').text()).toBe('2 linhas a resolver')
    const save = buttonWithText(wrapper, 'Salvar')
    expect(save.attributes('disabled')).toBeDefined()
    expect(save.attributes('title')).toBe('Resolva as 2 linhas para salvar')
  })

  it('says everything is resolved and frees saving', async () => {
    const { wrapper } = await render(
      undefined,
      draft({ totals: { lines: 6, pending: 0, ignored: 2, byAction: {} } }),
    )

    expect(wrapper.find('[data-slot="draft-status"]').text()).toBe('Tudo resolvido')
    const save = buttonWithText(wrapper, 'Salvar')
    expect(save.attributes('disabled')).toBeUndefined()
    expect(save.attributes('title')).toBeUndefined()
  })

  it('saves the draft and goes to the saved import', async () => {
    const { wrapper, router } = await render(
      undefined,
      draft({ totals: { lines: 6, pending: 0, ignored: 2, byAction: {} } }),
    )
    vi.mocked(importsApi.save).mockResolvedValue(draft({ status: 'SAVED' }))

    await buttonWithText(wrapper, 'Salvar').trigger('click')
    await flushPromises()

    expect(importsApi.save).toHaveBeenCalledWith('i-1')
    expect(router.currentRoute.value.name).toBe('imports.detail')
    expect(router.currentRoute.value.params.id).toBe('i-1')
  })

  it('shows what the server says when saving fails and stays on the draft', async () => {
    const { wrapper, router } = await render(
      undefined,
      draft({ totals: { lines: 6, pending: 0, ignored: 2, byAction: {} } }),
    )
    vi.mocked(importsApi.save).mockRejectedValue(
      problem(400, { error: 'invoice-not-open' } as never),
    )

    await buttonWithText(wrapper, 'Salvar').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'A fatura não está aberta e não aceita mudanças',
    )
    expect(router.currentRoute.value.name).not.toBe('imports.detail')
  })

  it('discards the draft after confirming and goes back to the list', async () => {
    const { wrapper, router } = await render()
    vi.mocked(importsApi.remove).mockResolvedValue()

    await buttonWithText(wrapper, 'Descartar').trigger('click')
    await flushPromises()
    useConfirmDialog().accept()
    await flushPromises()

    expect(importsApi.remove).toHaveBeenCalledWith('i-1')
    expect(router.currentRoute.value.name).toBe('imports')
  })

  it('keeps the draft when the discard is not confirmed', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Descartar').trigger('click')
    await flushPromises()
    useConfirmDialog().cancel()
    await flushPromises()

    expect(importsApi.remove).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).not.toBe('imports')
  })

  it('shows the error when discarding fails', async () => {
    const { wrapper } = await render()
    vi.mocked(importsApi.remove).mockRejectedValue(
      problem(409, { error: 'import-not-discardable' } as never),
    )

    await buttonWithText(wrapper, 'Descartar').trigger('click')
    await flushPromises()
    useConfirmDialog().accept()
    await flushPromises()

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Uma importação salva não se descarta',
    )
  })

  describe('selection and bulk actions', () => {
    function checkboxes(wrapper: Rendered) {
      return wrapper.findAll('tbody [data-slot="checkbox"]')
    }

    it('shows the bulk bar only while there are selected lines', async () => {
      const { wrapper } = await render()

      expect(wrapper.find('[data-slot="bulk-bar"]').exists()).toBe(false)

      await checkboxes(wrapper)[0]!.trigger('click')
      expect(wrapper.find('[data-slot="bulk-bar"]').text()).toContain('1 linha selecionada')

      await checkboxes(wrapper)[1]!.trigger('click')
      expect(wrapper.find('[data-slot="bulk-bar"]').text()).toContain('2 linhas selecionadas')

      await checkboxes(wrapper)[0]!.trigger('click')
      expect(wrapper.find('[data-slot="bulk-bar"]').text()).toContain('1 linha selecionada')
      expect(wrapper.find('[data-slot="line-dialog"]').exists()).toBe(false)
      expect(dialog()).toBeNull()
    })

    it('selects and unselects the visible lines from the header', async () => {
      const { wrapper } = await render()
      const header = wrapper.find('thead [data-slot="checkbox"]')

      await header.trigger('click')
      expect(wrapper.find('[data-slot="bulk-bar"]').text()).toContain('6 linhas selecionadas')

      await header.trigger('click')
      expect(wrapper.find('[data-slot="bulk-bar"]').exists()).toBe(false)

      await checkboxes(wrapper)[0]!.trigger('click')
      await header.trigger('click')
      expect(wrapper.find('[data-slot="bulk-bar"]').text()).toContain('6 linhas selecionadas')
    })

    it('clears the selection', async () => {
      const { wrapper } = await render()

      await checkboxes(wrapper)[0]!.trigger('click')
      await buttonWithText(wrapper, 'Limpar seleção').trigger('click')

      expect(wrapper.find('[data-slot="bulk-bar"]').exists()).toBe(false)
    })

    it('applies the action and the cost center only to the lines that accept them', async () => {
      const { wrapper } = await render()
      vi.mocked(importsApi.updateLines).mockResolvedValue()
      await wrapper.find('thead [data-slot="checkbox"]').trigger('click')

      const selects = wrapper.findComponent(ImportBulkBar).findAllComponents(FilterSelect)
      selects[0]!.vm.$emit('update:modelValue', 'CREATE_RECURRING')
      selects[1]!.vm.$emit('update:modelValue', 'cc-1')
      await flushPromises()
      await buttonWithText(wrapper, 'Aplicar').trigger('click')
      await flushPromises()

      expect(importsApi.updateLines).toHaveBeenCalledWith('i-1', {
        lines: ['l-1', 'l-2', 'l-3', 'l-5', 'l-6'],
        action: 'CREATE_RECURRING',
        costCenter: 'cc-1',
        classification: undefined,
      })
      expect(wrapper.find('[data-slot="bulk-bar"]').exists()).toBe(false)
      expect(vi.mocked(importsApi.findLines).mock.calls.length).toBeGreaterThan(1)
    })

    it('leaves out the lines of another type when the classification is set', async () => {
      const { wrapper } = await render()
      vi.mocked(importsApi.updateLines).mockResolvedValue()
      await wrapper.find('thead [data-slot="checkbox"]').trigger('click')

      const selects = wrapper.findComponent(ImportBulkBar).findAllComponents(FilterSelect)
      selects[2]!.vm.$emit('update:modelValue', 'cl-1')
      await flushPromises()
      await buttonWithText(wrapper, 'Aplicar').trigger('click')
      await flushPromises()

      expect(vi.mocked(importsApi.updateLines).mock.calls[0]![1].lines).toEqual([
        'l-1',
        'l-2',
        'l-3',
        'l-5',
        'l-6',
      ])
    })

    it('changes the selected lines and clears the selection when all of them accept it', async () => {
      const { wrapper } = await render()
      vi.mocked(importsApi.updateLines).mockResolvedValue()
      await checkboxes(wrapper)[0]!.trigger('click')
      await checkboxes(wrapper)[1]!.trigger('click')
      const selects = wrapper.findComponent(ImportBulkBar).findAllComponents(FilterSelect)
      selects[0]!.vm.$emit('update:modelValue', 'IGNORE')
      await flushPromises()

      await buttonWithText(wrapper, 'Aplicar').trigger('click')
      await flushPromises()

      expect(importsApi.updateLines).toHaveBeenCalledWith('i-1', {
        lines: ['l-1', 'l-2'],
        action: 'IGNORE',
        costCenter: undefined,
        classification: undefined,
      })
      expect(wrapper.find('[data-slot="bulk-bar"]').exists()).toBe(false)
    })

    it('keeps the selection and shows the error when the bulk change fails', async () => {
      const { wrapper } = await render()
      vi.mocked(importsApi.updateLines).mockRejectedValue(
        problem(400, { error: 'import-action-not-allowed' } as never),
      )
      await checkboxes(wrapper)[0]!.trigger('click')
      const selects = wrapper.findComponent(ImportBulkBar).findAllComponents(FilterSelect)
      selects[0]!.vm.$emit('update:modelValue', 'IGNORE')
      await flushPromises()

      await buttonWithText(wrapper, 'Aplicar').trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
        'Essa ação não vale para este destino e esta linha',
      )
      expect(wrapper.find('[data-slot="bulk-bar"]').exists()).toBe(true)
    })

    it('does not call the server when no selected line accepts the change', async () => {
      const { wrapper } = await render()
      await checkboxes(wrapper)[3]!.trigger('click')
      const selects = wrapper.findComponent(ImportBulkBar).findAllComponents(FilterSelect)
      selects[0]!.vm.$emit('update:modelValue', 'CREATE')
      await flushPromises()

      await buttonWithText(wrapper, 'Aplicar').trigger('click')
      await flushPromises()

      expect(importsApi.updateLines).not.toHaveBeenCalled()
    })

    it('offers the actions of a wallet statement', async () => {
      const { wrapper } = await render(
        undefined,
        draft({ target: 'WALLET', card: undefined, wallet: checking }),
      )
      await checkboxes(wrapper)[0]!.trigger('click')

      const options = wrapper.findComponent(ImportBulkBar).findAllComponents(FilterSelect)[0]!
      expect(options.props('options').map((option: { value: string }) => option.value)).toEqual([
        'CREATE',
        'LINK',
        'INVOICE_PAYMENT',
        'TRANSFER',
        'COMPARTMENT',
        'IGNORE',
      ])
    })
  })

  describe('line dialog', () => {
    it('opens the line that was clicked and reloads the lines when it is saved', async () => {
      const { wrapper } = await render()
      vi.mocked(importsApi.updateLine).mockResolvedValue(line())
      const loaded = vi.mocked(importsApi.findLines).mock.calls.length

      await wrapper.findAll('tbody tr')[1]!.trigger('click')
      await flushPromises()
      expect((document.body.querySelector('#import-line-name') as HTMLInputElement).value).toBe(
        'Posto Estrela',
      )

      dialogButton('Salvar').click()
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(vi.mocked(importsApi.findLines).mock.calls.length).toBe(loaded + 1)
    })

    it('opens the line once from the edit button at the end of the row', async () => {
      const { wrapper } = await render()
      const edit = wrapper.findAll('tbody tr')[1]!.find('button[aria-label="Editar"]')

      expect(wrapper.findAll('tbody tr')[1]!.findAll('td').slice(-1)[0]!.classes()).toContain('w-0')
      await edit.trigger('click')
      await flushPromises()

      expect(document.body.querySelectorAll('[data-slot="line-dialog"]')).toHaveLength(1)
      expect((document.body.querySelector('#import-line-name') as HTMLInputElement).value).toBe(
        'Posto Estrela',
      )
    })

    it('does not reload the lines when the dialog is cancelled', async () => {
      const { wrapper } = await render()
      const loaded = vi.mocked(importsApi.findLines).mock.calls.length

      await wrapper.findAll('tbody tr')[0]!.trigger('click')
      await flushPromises()
      dialogButton('Cancelar').click()
      await flushPromises()

      expect(dialog()).toBeNull()
      expect(vi.mocked(importsApi.findLines).mock.calls.length).toBe(loaded)
    })

    it('does not open the dialog when the checkbox of the line is clicked', async () => {
      const { wrapper } = await render()

      await wrapper.find('tbody [data-slot="checkbox"]').trigger('click')

      expect(dialog()).toBeNull()
    })
  })

  describe('with compartments', () => {
    const reserve = { id: 'k-1', name: 'Reserva da casa', balance: 1000 }
    const checkboxes = (wrapper: Rendered) => wrapper.findAll('tbody [data-slot="checkbox"]')
    const WALLET_ACTIONS: ImportAction[] = ['CREATE', 'LINK', 'COMPARTMENT', 'IGNORE']
    const compartmentLines = [
      line({
        id: 'k-1',
        name: 'Poupança',
        value: -300,
        action: 'COMPARTMENT',
        allowedActions: WALLET_ACTIONS,
        compartment: reserve,
        costCenter: undefined,
        classification: undefined,
      }),
      line({
        id: 'k-2',
        position: 2,
        postedOn: '2026-11-22',
        name: 'Resgate',
        value: 150,
        action: 'COMPARTMENT',
        allowedActions: WALLET_ACTIONS,
        compartment: { id: 'k-2', name: 'IPTU 2027', balance: 1050 },
        costCenter: undefined,
        classification: undefined,
      }),
      line({
        id: 'k-3',
        position: 3,
        name: 'Sem parte',
        value: -20,
        action: 'COMPARTMENT',
        allowedActions: WALLET_ACTIONS,
        pending: ['compartment'],
        costCenter: undefined,
        classification: undefined,
      }),
    ]
    const walletDraft = (overrides: Partial<ImportView> = {}) =>
      draft({
        target: 'WALLET',
        card: undefined,
        wallet: { ...checking, compartmentCount: 2 },
        totals: { lines: 3, pending: 1, ignored: 0, byAction: {} },
        warnings: {
          unlinkedRecurring: [],
          ledgerBalance: 900,
          afterSave: 1010,
          currentBalance: 800,
          ignoredCredits: 0,
          totalAfterSave: 2010,
        },
        ...overrides,
      })

    it('shows five cards with the free balance and the total after saving', async () => {
      const { wrapper } = await render(undefined, walletDraft(), compartmentLines)

      expect(wrapper.find('[data-slot="draft-totals"] .grid').classes()).toContain('xl:grid-cols-5')
      expect(wrapper.find('[data-slot="total-after"]').text()).toContain(
        'Saldo livre depois de salvar',
      )
      expect(wrapper.find('[data-slot="total-after"]').text()).toContain('1.010,00')
      expect(wrapper.find('[data-slot="total-after-compartments"]').text()).toContain(
        'Total depois de salvar',
      )
      expect(wrapper.find('[data-slot="total-after-compartments"]').text()).toContain('2.010,00')
    })

    it('keeps the four cards when the wallet has no compartment', async () => {
      const { wrapper } = await render(
        undefined,
        walletDraft({ wallet: { ...checking, compartmentCount: 0 } }),
        compartmentLines,
      )

      expect(wrapper.find('[data-slot="draft-totals"] .grid').classes()).toContain('xl:grid-cols-4')
      expect(wrapper.find('[data-slot="total-after"]').text()).toContain('Saldo depois de salvar')
      expect(wrapper.find('[data-slot="total-after-compartments"]').exists()).toBe(false)
    })

    it('keeps the four cards in a card import', async () => {
      const { wrapper } = await render()

      expect(wrapper.find('[data-slot="draft-totals"] .grid').classes()).toContain('xl:grid-cols-4')
    })

    it('tells the action and where the money goes, and marks the line without the compartment', async () => {
      const { wrapper } = await render(undefined, walletDraft(), compartmentLines)

      expect(rowTexts(wrapper).map((row) => [row[4], row[5]])).toEqual([
        ['Cofrinho', 'Guardar em Reserva da casa'],
        ['Cofrinho', 'Resgatar de IPTU 2027'],
        ['Cofrinho', 'Falta cofrinho'],
      ])
      expect(wrapper.findAll('tbody tr')[2]!.attributes('data-state')).toBe('selected')
    })

    it('offers the action in the bulk bar of the wallet', async () => {
      const { wrapper } = await render(undefined, walletDraft(), compartmentLines)
      await checkboxes(wrapper)[0]!.trigger('click')

      const options = wrapper.findComponent(ImportBulkBar).findAllComponents(FilterSelect)[0]!
      expect(options.props('options').map((option: { label: string }) => option.label)).toContain(
        'Cofrinho',
      )
    })

    describe('when a withdrawal passes the balance', () => {
      const refusal = problem(422, {
        error: 'import-compartment-balance-exceeded',
        parameters: {
          lines: [
            {
              id: 'k-2',
              position: 2,
              postedOn: '2026-11-22',
              compartment: 'Reserva da casa',
              balance: 1000,
            },
          ],
        },
      } as never)

      async function refused() {
        const rendered = await render(
          undefined,
          walletDraft({ totals: { lines: 3, pending: 0, ignored: 0, byAction: {} } }),
          compartmentLines,
        )
        vi.mocked(importsApi.save).mockRejectedValue(refusal)
        await buttonWithText(rendered.wrapper, 'Salvar').trigger('click')
        await flushPromises()
        return rendered
      }

      it('shows the alert at the top, goes to all the lines and marks the refused one', async () => {
        const { wrapper, router } = await refused()

        const alert = wrapper.find('[data-slot="save-rejections"]')
        expect(alert.text()).toContain('Não foi possível salvar')
        expect(alert.text()).toContain(
          'O resgate de 22/11 passa do saldo de Reserva da casa (1.000,00), somado ao das linhas anteriores.',
        )
        expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
        expect(lastQuery().pending).toBeUndefined()
        expect(router.currentRoute.value.name).not.toBe('imports.detail')

        const rows = wrapper.findAll('tbody tr')
        expect(rows[0]!.find('[data-slot="line-balance-error"]').exists()).toBe(false)
        expect(rows[1]!.find('[data-slot="line-balance-error"]').text()).toBe(
          'Passa do saldo de Reserva da casa',
        )
        expect(rows[1]!.attributes('data-state')).toBe('selected')
      })

      it('shows the badge in the dialog of the line and clears the error when the line is saved', async () => {
        const { wrapper } = await refused()
        vi.mocked(importsApi.updateLine).mockResolvedValue(compartmentLines[1]!)
        vi.mocked(importsApi.candidates).mockResolvedValue([])

        await wrapper.findAll('tbody tr')[1]!.trigger('click')
        await flushPromises()

        expect(dialog()!.textContent).toContain('Passa do saldo de Reserva da casa')

        dialogButton('Salvar').click()
        await flushPromises()

        expect(wrapper.find('[data-slot="save-rejections"]').exists()).toBe(false)
        expect(wrapper.find('[data-slot="line-balance-error"]').exists()).toBe(false)
      })

      it('clears the refusals when it saves again', async () => {
        const { wrapper } = await refused()
        vi.mocked(importsApi.save).mockResolvedValue(draft({ status: 'SAVED' }))

        await buttonWithText(wrapper, 'Salvar').trigger('click')
        await flushPromises()

        expect(wrapper.find('[data-slot="save-rejections"]').exists()).toBe(false)
      })
    })
  })

  describe('on a phone', () => {
    it('turns the lines into cards with a checkbox that selects all', async () => {
      useCompactViewport(true)
      const { wrapper } = await render()

      const cards = wrapper.findAll('[data-layout="compact"] > div')
      expect(cards).toHaveLength(7)
      expect(cards[0]!.text()).toBe('Selecionar todas')

      await cards[0]!.find('[data-slot="checkbox"]').trigger('click')
      expect(wrapper.find('[data-slot="bulk-bar"]').text()).toContain('6 linhas selecionadas')

      await cards[1]!.find('[data-slot="checkbox"]').trigger('click')
      expect(wrapper.find('[data-slot="bulk-bar"]').text()).toContain('5 linhas selecionadas')
      expect(cards[1]!.text()).toContain('Supermercado Boa Compra')
      expect(cards[1]!.text()).toContain('02/11')
    })
  })
})
