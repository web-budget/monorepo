import { flushPromises, type DOMWrapper } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { importsApi } from '@/api/imports'
import { buttonWithText, mountView, namedTestRoutes, pageOf, problem } from '@/test/crud'
import type { ImportCandidateView, ImportLineQuery, ImportLineView, ImportView } from '@/types'
import ImportDetailScreen from '@/views/financial/imports/ImportDetailView.vue'

vi.mock('@/api/imports')

const period = { id: 'p-11', name: 'Novembro de 2026', status: 'OPEN', expired: false }
const visa = { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '4821' }
const checking = { id: 'w-1', name: 'Conta corrente' }

function entry(overrides: Partial<ImportView> = {}): ImportView {
  return {
    id: 'i-1',
    fileName: 'fatura-visa-novembro.ofx',
    target: 'CARD',
    card: visa,
    financialPeriod: period,
    status: 'SAVED',
    createdOn: '2026-11-26T09:02:00',
    savedOn: '2026-11-26T10:12:00',
    totals: { lines: 5, pending: 0, ignored: 1, byAction: {} },
    result: { created: 2, linked: 1, recurring: 1, transfers: 0, ignored: 1 },
    warnings: { unlinkedRecurring: [], afterSave: 0, ignoredCredits: 0 },
    undoBlockers: [],
    ...overrides,
  } as ImportView
}

function candidate(kind: ImportCandidateView['kind'], id: string, name: string) {
  return { kind, id, name, value: 10, recurring: false } as ImportCandidateView
}

function line(overrides: Partial<ImportLineView>): ImportLineView {
  return {
    id: 'l-1',
    position: 1,
    postedOn: '2026-11-02',
    value: -223.1,
    description: 'SUPERMERCADO',
    name: 'Supermercado Boa Compra',
    kind: 'PURCHASE',
    action: 'CREATE',
    allowedActions: [],
    alreadyImported: false,
    alreadyRegistered: false,
    fromMemory: false,
    differentValue: false,
    created: [candidate('PURCHASE', 'pu-1', 'Supermercado Boa Compra')],
    pending: [],
    ...overrides,
  }
}

const cardLines = [
  line({}),
  line({
    id: 'l-2',
    name: 'Seguro de vida',
    action: 'LINK',
    created: [],
    link: {
      ...candidate('PURCHASE', 'pu-2', 'Seguro de vida'),
      financialPeriod: { id: 'p-10', name: 'Outubro de 2026', status: 'CLOSED', expired: true },
    },
  }),
  line({
    id: 'l-3',
    name: 'Curso de fotografia',
    action: 'CREATE_RECURRING',
    installment: 1,
    installments: 4,
    created: [candidate('RECURRING', 'r-1', 'Curso'), candidate('MOVEMENT', 'm-1', 'Curso')],
  }),
  line({
    id: 'l-4',
    name: 'Academia',
    action: 'LAUNCH_RECURRING',
    link: candidate('RECURRING', 'r-2', 'Academia mensal'),
    created: [],
  }),
  line({
    id: 'l-5',
    name: 'Pagamento recebido',
    value: 1490.2,
    action: 'IGNORE',
    created: [],
    ignoreReason: { code: 'payment-received' },
  }),
]

const walletLines = [
  line({ id: 'w-1', value: 8400, name: 'Empresa Exemplo', created: [candidate('MOVEMENT', 'm-5', 'Salário')] }),
  line({ id: 'w-2', name: 'Padaria', created: [candidate('MOVEMENT', 'm-6', 'Padaria')] }),
  line({
    id: 'w-3',
    name: 'Ana Paula',
    action: 'LINK',
    created: [],
    link: candidate('MOVEMENT', 'm-7', 'Aluguel'),
  }),
  line({
    id: 'w-4',
    name: 'Salário',
    value: 8400,
    action: 'LINK',
    created: [],
    link: candidate('MOVEMENT', 'm-8', 'Salário outubro'),
  }),
  line({
    id: 'w-5',
    name: 'Conta corrente',
    value: 500,
    action: 'LINK',
    created: [],
    link: candidate('TRANSFER', 't-1', 'Transferência'),
  }),
  line({
    id: 'w-6',
    name: 'Fatura',
    action: 'INVOICE_PAYMENT',
    created: [],
    link: candidate('MOVEMENT', 'm-9', 'Visa Platinum, Setembro de 2026'),
  }),
  line({
    id: 'w-7',
    name: 'Fundo',
    action: 'TRANSFER',
    wallet: { id: 'w-2', name: 'Poupança' },
    created: [candidate('TRANSFER', 't-2', 'Fundo')],
  }),
  line({
    id: 'w-8',
    name: 'Resgate',
    value: 500,
    action: 'IGNORE',
    created: [],
    ignoreReason: { code: 'already-registered' },
  }),
  line({ id: 'w-9', name: 'Tarifa', action: 'IGNORE', created: [] }),
]

const routes = namedTestRoutes(
  'movements.detail',
  'purchases.detail',
  'transfers.detail',
  'recurring-movements.detail',
)

function serve(item: ImportView, lines = cardLines) {
  vi.mocked(importsApi.findById).mockResolvedValue(item)
  vi.mocked(importsApi.findLines).mockImplementation((_id, query) =>
    Promise.resolve(
      pageOf(lines.filter((candidate) => !query.actions || query.actions.includes(candidate.action))),
    ),
  )
}

function lastQuery(): ImportLineQuery {
  return vi.mocked(importsApi.findLines).mock.calls.slice(-1)[0]![1]
}

async function render(item = entry(), lines = cardLines, location?: string) {
  serve(item, lines)
  return mountView(ImportDetailScreen, 'imports', { id: 'i-1' }, {}, location, routes)
}

type Rendered = Awaited<ReturnType<typeof render>>['wrapper']

function rowTexts(wrapper: Rendered) {
  return wrapper
    .findAll('tbody tr')
    .map((row) => row.findAll('td').map((cell) => cell.text().replace(/\s+/g, ' ')))
}

function hrefOf(row: DOMWrapper<Element>) {
  const link = row.find('a')
  return link.exists() ? link.attributes('href') : undefined
}

function dialogText() {
  return document.body.querySelector('[data-slot="undo-dialog"]')?.textContent ?? ''
}

function dialogButton(text: string) {
  const button = Array.from(document.body.querySelectorAll('[data-slot="undo-dialog"] button')).find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  if (!button) {
    throw new Error(`no dialog button "${text}"`)
  }
  return button as HTMLButtonElement
}

describe('ImportSavedView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the file, the destination, the period and when it was saved', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('h1').text()).toBe('fatura-visa-novembro.ofx')
    expect(wrapper.find('[data-slot="import-status"]').text()).toBe('Salva')
    expect(wrapper.text()).toContain('Visa Platinum ••4821')
    expect(wrapper.text()).toContain('Novembro de 2026')
    expect(wrapper.text()).toContain('salva em 26/11/2026 10:12')
    expect(buttonWithText(wrapper, 'Desfazer importação').attributes('disabled')).toBeUndefined()
  })

  it('summarizes what the import did in four cards', async () => {
    const { wrapper } = await render()

    expect(wrapper.find('[data-slot="saved-totals"]').text()).toBe(
      'Criadas2Vinculadas1Recorrentes1Ignoradas1',
    )
  })

  it('opens on the created lines, with the counts of every tab', async () => {
    const { wrapper, router } = await render()

    expect(lastQuery()).toMatchObject({ actions: ['CREATE'], sort: 'postedOn,asc', page: 0 })
    expect(router.currentRoute.value.query).toEqual({})
    expect(wrapper.findAll('[data-slot="status-count"]').map((count) => count.text())).toEqual([
      '2',
      '1',
      '1',
      '1',
      '5',
    ])
    expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual([
      'Data',
      'Nome',
      'Valor (R$)',
      'Resultado',
      'Abrir',
    ])
  })

  it.each([
    ['Vinculadas', 'LINKED', ['LINK', 'INVOICE_PAYMENT']],
    ['Recorrentes', 'RECURRING', ['LAUNCH_RECURRING', 'CREATE_RECURRING']],
    ['Ignoradas', 'IGNORED', ['IGNORE']],
    ['Todas', 'ALL', undefined],
  ])('shows the %s tab and keeps it in the URL', async (label, status, actions) => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, label).trigger('click')
    await flushPromises()

    expect(lastQuery().actions).toEqual(actions)
    expect(router.currentRoute.value.query).toEqual({ status })
  })

  it('opens on the tab of the URL', async () => {
    await render(entry(), cardLines, '/imports?status=IGNORED&page=2')

    expect(lastQuery()).toMatchObject({ actions: ['IGNORE'], page: 1 })
  })

  it('tells what each line did and links to what it generated', async () => {
    const { wrapper } = await render(entry(), cardLines, '/imports?status=ALL')

    const rows = rowTexts(wrapper).map((row) => row.slice(0, 4))
    expect(rows).toEqual([
      ['02/11', 'Supermercado Boa Compra', 'R$ 223,10', 'Compra criada na fatura'],
      ['02/11', 'Seguro de vida', 'R$ 223,10', 'Vinculada a “Seguro de vida” de Outubro, paga no cartão'],
      [
        '02/11',
        'Curso de fotografia',
        'R$ 223,10',
        'Recorrente criado (1/4) e parcela paga no cartão',
      ],
      ['02/11', 'Academia', 'R$ 223,10', 'Parcela lançada de “Academia mensal” e paga no cartão'],
      ['02/11', 'Pagamento recebido', 'R$ 1.490,20', 'Pagamento da fatura anterior'],
    ])
    expect(wrapper.findAll('tbody tr').map((row) => hrefOf(row))).toEqual([
      '/__purchases.detail/pu-1',
      '/__purchases.detail/pu-2',
      '/__movements.detail/m-1',
      '/__recurring-movements.detail/r-2',
      undefined,
    ])
    expect(wrapper.find('tbody a').attributes('aria-label')).toBe(
      'Abrir o lançamento de Supermercado Boa Compra',
    )
    expect(wrapper.findAll('[data-slot="line-value"]').map((value) => value.attributes('data-direction'))).toEqual(
      ['out', 'out', 'out', 'out', 'in'],
    )
  })

  it('opens what the line generated', async () => {
    const { wrapper, router } = await render()

    await wrapper.find('tbody a').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('purchases.detail')
    expect(router.currentRoute.value.params.id).toBe('pu-1')
  })

  it('shows the transfers instead of the recurrings in a wallet, and what each line did', async () => {
    const { wrapper } = await render(
      entry({
        target: 'WALLET',
        card: undefined,
        wallet: checking,
        result: { created: 2, linked: 4, recurring: 0, transfers: 1, ignored: 2 },
      }),
      walletLines,
      '/imports?status=ALL',
    )

    expect(wrapper.find('[data-slot="saved-totals"]').text()).toBe(
      'Criadas2Vinculadas4Transferências1Ignoradas2',
    )
    expect(wrapper.text()).toContain('Transferências')
    expect(wrapper.text()).not.toContain('Recorrentes')
    expect(rowTexts(wrapper).map((row) => row[3])).toEqual([
      'Receita criada, já recebida',
      'Despesa criada, já paga',
      'Vinculada a “Aluguel”, paga pela linha',
      'Vinculada a “Salário outubro”, recebida pela linha',
      'Vinculada à transferência já registrada',
      'Pagou “Visa Platinum, Setembro de 2026”',
      'Transferência para Poupança',
      'Já registrada',
      'Ignorada por você',
    ])
    expect(wrapper.findAll('tbody tr').map((row) => hrefOf(row))).toEqual([
      '/__movements.detail/m-5',
      '/__movements.detail/m-6',
      '/__movements.detail/m-7',
      '/__movements.detail/m-8',
      '/__transfers.detail/t-1',
      '/__movements.detail/m-9',
      '/__transfers.detail/t-2',
      undefined,
      undefined,
    ])
  })

  it('lists only the transfers in their tab', async () => {
    const { wrapper } = await render(
      entry({
        target: 'WALLET',
        card: undefined,
        wallet: checking,
        result: { created: 2, linked: 4, recurring: 0, transfers: 1, ignored: 2 },
      }),
      walletLines,
    )

    await buttonWithText(wrapper, 'Transferências').trigger('click')
    await flushPromises()

    expect(lastQuery().actions).toEqual(['TRANSFER'])
    expect(rowTexts(wrapper).map((row) => row[1])).toEqual(['Fundo'])
  })

  it('says there is no line in a tab that is empty', async () => {
    const { wrapper } = await render(entry(), [])

    expect(wrapper.find('[data-state="no-result"]').text()).toBe('Nenhuma linha nesta aba')
  })

  it('shows the error of the server and tries again', async () => {
    serve(entry())
    vi.mocked(importsApi.findLines).mockRejectedValueOnce(problem(500))
    const { wrapper } = await mountView(
      ImportDetailScreen,
      'imports',
      { id: 'i-1' },
      {},
      undefined,
      routes,
    )

    expect(wrapper.find('[data-state="error"]').exists()).toBe(true)

    await buttonWithText(wrapper, 'Tentar de novo').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-state="error"]').exists()).toBe(false)
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })

  it('goes to another page of the lines', async () => {
    serve(entry())
    vi.mocked(importsApi.findLines).mockResolvedValue(pageOf(cardLines, 40))
    const { wrapper } = await mountView(
      ImportDetailScreen,
      'imports',
      { id: 'i-1' },
      {},
      undefined,
      routes,
    )

    await wrapper.find('[aria-label="Próxima página"]').trigger('click')
    await flushPromises()

    expect(lastQuery()).toMatchObject({ page: 1, size: 15 })
  })

  describe('undoing', () => {
    it('asks for confirmation telling what will be reverted in a card invoice', async () => {
      const { wrapper } = await render()

      await buttonWithText(wrapper, 'Desfazer importação').trigger('click')
      await flushPromises()

      expect(dialogText()).toContain('Desfazer a importação de fatura-visa-novembro.ofx?')
      expect(dialogText()).toContain('Exclui 2 compras criadas da fatura.')
      expect(dialogText()).toContain('Tira da fatura 1 lançamento vinculado, que volta para em aberto')
      expect(dialogText()).toContain('Exclui 1 parcela lançada pela importação')
    })

    it('leaves out the recurrings when the import launched none', async () => {
      const { wrapper } = await render(
        entry({ result: { created: 1, linked: 1, recurring: 0, transfers: 0, ignored: 0 } }),
      )

      await buttonWithText(wrapper, 'Desfazer importação').trigger('click')
      await flushPromises()

      expect(dialogText()).toContain('Exclui 1 compra criada da fatura.')
      expect(dialogText()).not.toContain('parcela')
    })

    it('tells what will be reverted in a wallet, with the transfers and the note', async () => {
      const { wrapper } = await render(
        entry({
          target: 'WALLET',
          card: undefined,
          wallet: checking,
          result: { created: 2, linked: 1, recurring: 0, transfers: 1, ignored: 0 },
        }),
        walletLines,
      )

      await buttonWithText(wrapper, 'Desfazer importação').trigger('click')
      await flushPromises()

      expect(dialogText()).toContain('Exclui 2 movimentos criados, com o estorno no extrato.')
      expect(dialogText()).toContain('Desfaz o pagamento de 1 lançamento vinculado')
      expect(dialogText()).toContain('Devolve 1 transferência criada pela importação.')
      expect(dialogText()).toContain('só são desfeitos; a transferência fica')
    })

    it('leaves out the transfers when the import made none', async () => {
      const { wrapper } = await render(
        entry({
          target: 'WALLET',
          card: undefined,
          wallet: checking,
          result: { created: 2, linked: 1, recurring: 0, transfers: 0, ignored: 0 },
        }),
        walletLines,
      )

      await buttonWithText(wrapper, 'Desfazer importação').trigger('click')
      await flushPromises()

      expect(dialogText()).not.toContain('Devolve')
    })

    it('closes the confirmation without undoing', async () => {
      const { wrapper } = await render()
      await buttonWithText(wrapper, 'Desfazer importação').trigger('click')
      await flushPromises()

      dialogButton('Cancelar').click()
      await flushPromises()

      expect(document.body.querySelector('[data-slot="undo-dialog"]')).toBeNull()
      expect(importsApi.undo).not.toHaveBeenCalled()
    })

    it('undoes the import and shows it as undone, without links', async () => {
      const { wrapper } = await render()
      vi.mocked(importsApi.undo).mockResolvedValue(
        entry({ status: 'UNDONE', undoneOn: '2026-11-26T10:20:00' }),
      )
      await buttonWithText(wrapper, 'Desfazer importação').trigger('click')
      await flushPromises()

      dialogButton('Desfazer').click()
      await flushPromises()

      expect(importsApi.undo).toHaveBeenCalledWith('i-1')
      expect(document.body.querySelector('[data-slot="undo-dialog"]')).toBeNull()
      expect(wrapper.find('[data-slot="import-status"]').text()).toBe('Desfeita')
      expect(wrapper.find('[data-slot="undone-alert"]').text()).toBe('Desfeita em 26/11/2026 10:20')
      expect(wrapper.find('tbody a').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('Desfazer importação')
    })

    it('undoes the import of a wallet', async () => {
      const { wrapper } = await render(
        entry({ target: 'WALLET', card: undefined, wallet: checking }),
        walletLines,
      )
      vi.mocked(importsApi.undo).mockResolvedValue(
        entry({ target: 'WALLET', card: undefined, wallet: checking, status: 'UNDONE' }),
      )
      await buttonWithText(wrapper, 'Desfazer importação').trigger('click')
      await flushPromises()

      dialogButton('Desfazer').click()
      await flushPromises()

      expect(wrapper.find('[data-slot="import-status"]').text()).toBe('Desfeita')
      expect(wrapper.find('[data-slot="undone-alert"]').text()).toBe('Desfeita em')
    })

    it('shows the error inside the dialog, keeps it open and refreshes the blockers', async () => {
      const { wrapper } = await render()
      vi.mocked(importsApi.undo).mockRejectedValue(
        problem(409, { error: 'import-undo-blocked' } as never),
      )
      await buttonWithText(wrapper, 'Desfazer importação').trigger('click')
      await flushPromises()
      vi.mocked(importsApi.findById).mockResolvedValue(
        entry({ undoBlockers: [{ reason: 'invoice-not-open' }] }),
      )

      dialogButton('Desfazer').click()
      await flushPromises()

      expect(dialogText()).toContain('Algo mudou depois do salvamento')
      expect(importsApi.findById).toHaveBeenLastCalledWith('i-1', true)
      expect(wrapper.find('[data-slot="undo-blocked"]').exists()).toBe(true)
    })

    it('forgets the error of a previous attempt when it is opened again', async () => {
      const { wrapper } = await render()
      vi.mocked(importsApi.undo).mockRejectedValue(problem(500))
      await buttonWithText(wrapper, 'Desfazer importação').trigger('click')
      await flushPromises()
      dialogButton('Desfazer').click()
      await flushPromises()
      expect(document.body.querySelector('[data-slot="undo-dialog"] [data-slot="server-error"]')).not.toBeNull()

      dialogButton('Cancelar').click()
      await flushPromises()
      await buttonWithText(wrapper, 'Desfazer importação').trigger('click')
      await flushPromises()

      expect(document.body.querySelector('[data-slot="undo-dialog"] [data-slot="server-error"]')).toBeNull()
    })
  })

  describe('when undoing is blocked', () => {
    const blockers = [
      { reason: 'financial-period-not-open' },
      { reason: 'invoice-not-open' },
      { reason: 'created-purchase-changed', position: 3, name: 'Posto Estrela' },
      { reason: 'linked-entry-changed', position: 4, name: 'Seguro' },
      { reason: 'launched-movement-changed', position: 5, name: 'Academia' },
      { reason: 'recurring-launched-elsewhere', position: 6, name: 'Curso' },
      { reason: 'created-movement-changed', position: 7, name: 'Padaria' },
      { reason: 'linked-period-not-open', position: 8, name: 'Aluguel' },
      { reason: 'created-transfer-changed', position: 9, name: 'Fundo' },
      { reason: 'something-new', position: 10, name: 'Outro' },
    ]

    it('disables the button and lists what stops it', async () => {
      const { wrapper } = await render(entry({ undoBlockers: blockers }))

      expect(buttonWithText(wrapper, 'Desfazer importação').attributes('disabled')).toBeDefined()
      const items = wrapper.findAll('[data-slot="undo-blocked"] li').map((item) => item.text())
      expect(items).toEqual([
        'Novembro de 2026 não está aberto.',
        'A fatura de Novembro de 2026 do Visa Platinum não está aberta.',
        'A compra criada por “Posto Estrela” (linha 3) foi alterada depois de salva.',
        'O lançamento vinculado a “Seguro” (linha 4) foi alterado depois de salvo.',
        'O lançamento da parcela de “Academia” (linha 5) foi alterado depois de salvo.',
        'O recorrente de “Curso” (linha 6) já lançou parcelas em outro período.',
        'O movimento criado por “Padaria” (linha 7) foi alterado depois de salvo.',
        'O período do lançamento vinculado a “Aluguel” (linha 8) não está aberto.',
        'A transferência criada por “Fundo” (linha 9) foi alterada depois de salva.',
        'Algo mudou depois do salvamento.',
      ])
      expect(wrapper.find('[data-slot="undo-blocked"]').text()).toContain('Desfazer está bloqueado')
    })
  })

  describe('when it is undone', () => {
    it('says when, without the undo button, and imports again to the same destination', async () => {
      const { wrapper, router } = await render(
        entry({ status: 'UNDONE', undoneOn: '2026-11-26T10:20:00' }),
      )

      expect(wrapper.find('[data-slot="import-status"]').text()).toBe('Desfeita')
      expect(wrapper.find('[data-slot="undone-alert"]').text()).toBe('Desfeita em 26/11/2026 10:20')
      expect(wrapper.text()).not.toContain('Desfazer importação')
      expect(wrapper.find('tbody a').exists()).toBe(false)

      await buttonWithText(wrapper, 'Importar de novo').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('imports.create')
      expect(router.currentRoute.value.query).toEqual({ card: 'c-1', period: 'p-11' })
    })

    it('imports a wallet again to the same wallet', async () => {
      const { wrapper, router } = await render(
        entry({ target: 'WALLET', card: undefined, wallet: checking, status: 'UNDONE' }),
        walletLines,
      )

      await buttonWithText(wrapper, 'Importar de novo').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.query).toEqual({ wallet: 'w-1', period: 'p-11' })
    })
  })
})
