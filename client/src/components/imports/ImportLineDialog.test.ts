import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { importsApi } from '@/api/imports'
import { filterFields } from '@/test/combobox'
import { Dialog } from '@/components/ui/dialog'
import ImportLineDialog from '@/components/imports/ImportLineDialog.vue'
import { problem } from '@/test/crud'
import { createTestPlugins } from '@/test/mounting'
import type {
  ClassificationListView,
  CostCenterListView,
  ImportAction,
  ImportCandidateView,
  ImportLineView,
  WalletListView,
} from '@/types'

vi.mock('@/api/imports')

const personal = { id: 'cc-1', name: 'Pessoal', fullName: 'Pessoal' }
const groceries = { id: 'cl-1', name: 'Mercado', type: 'EXPENSE' as const }

const CARD_ACTIONS: ImportAction[] = [
  'CREATE',
  'LINK',
  'LAUNCH_RECURRING',
  'CREATE_RECURRING',
  'IGNORE',
]

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

const candidates = [
  { kind: 'MOVEMENT', id: 'm-1', name: 'Seguro de vida', value: 60, recurring: false },
  {
    kind: 'MOVEMENT',
    id: 'm-2',
    name: 'Mensalidade',
    value: 223.1,
    recurring: false,
    costCenter: personal,
    classification: groceries,
    financialPeriod: { id: 'p-10', name: 'Outubro de 2026', status: 'CLOSED', expired: true },
  },
] as ImportCandidateView[]

const costCenters = [
  { id: 'cc-1', name: 'Pessoal', fullName: 'Pessoal', active: true },
] as CostCenterListView[]
const classifications = [
  { id: 'cl-1', name: 'Mercado', type: 'EXPENSE', active: true },
  { id: 'cl-2', name: 'Freelas', type: 'INCOME', active: true },
] as ClassificationListView[]
const wallets = [{ id: 'w-2', name: 'Poupança', type: 'SAVINGS' }] as unknown as WalletListView[]

function render(current: ImportLineView | null, balanceError?: string) {
  const { plugins } = createTestPlugins({ stubActions: false })
  return mount(ImportLineDialog, {
    props: {
      importId: 'i-1',
      periodId: 'p-11',
      line: current,
      balanceError,
      costCenters,
      classifications,
      wallets,
    },
    attachTo: document.body,
    global: { plugins },
  })
}

type Rendered = ReturnType<typeof render>

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

function type(selector: string, value: string) {
  const input = document.body.querySelector(selector) as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  return flushPromises()
}

function selects(wrapper: Rendered) {
  return filterFields(wrapper)
}

function choose(wrapper: Rendered, index: number, value: string) {
  selects(wrapper)[index]!.vm.$emit('update:modelValue', value)
  return flushPromises()
}

describe('ImportLineDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.mocked(importsApi.candidates).mockResolvedValue(candidates)
  })

  it('keeps the amount out of the header, next to the bank description in the file block', async () => {
    render(
      line({ installment: 11, installments: 12, action: 'CREATE_RECURRING', fromMemory: true }),
    )
    await flushPromises()

    const header = dialog()!.querySelector('[data-slot="dialog-header"]')!
    const file = dialog()!.querySelector('[data-slot="line-file"]')!

    expect(header.querySelector('[data-slot="line-value"]')).toBeNull()
    expect(header.textContent).toContain('Linha de 02/11')
    expect(file.querySelector('[data-slot="line-value"]')).not.toBeNull()
    expect(file.textContent).toContain('SUPERMERCADO BOA COMPRA')
    expect(file.querySelector('[data-slot="line-value"]')!.textContent).not.toContain('R$')
  })

  it('hides the installment badge, which the fields already show, and labels the memory', async () => {
    render(
      line({ installment: 11, installments: 12, action: 'CREATE_RECURRING', fromMemory: true }),
    )
    await flushPromises()

    const file = dialog()!.querySelector('[data-slot="line-file"]')!

    expect(file.textContent).not.toContain('11/12')
    expect(file.querySelector('[data-slot="line-memory"]')!.textContent).toContain(
      'Sugerida pela memória',
    )
  })

  it('stays closed without a line', async () => {
    render(null)
    await flushPromises()

    expect(dialog()).toBeNull()
  })

  it('opens the line with the date, the amount, the bank description and the name', async () => {
    const wrapper = render(line({ fromMemory: true }))
    await flushPromises()

    expect(dialog()!.textContent).toContain('Linha de 02/11')
    expect(dialog()!.textContent).toContain('SUPERMERCADO BOA COMPRA')
    expect(dialog()!.textContent).toContain('Sugerida pela memória')
    expect((document.body.querySelector('#import-line-name') as HTMLInputElement).value).toBe(
      'Supermercado Boa Compra',
    )
    expect(importsApi.candidates).not.toHaveBeenCalled()
    expect(selects(wrapper)).toHaveLength(3)
  })

  it('completes a line to create with the name, the cost center and the classification', async () => {
    const wrapper = render(line({ pending: ['cost-center'], costCenter: undefined }))
    vi.mocked(importsApi.updateLine).mockResolvedValue(line())
    await flushPromises()

    await type('#import-line-name', '  Posto Estrela  ')
    await choose(wrapper, 1, 'cc-1')
    await choose(wrapper, 2, 'cl-1')
    dialogButton('Salvar').click()
    await flushPromises()

    expect(importsApi.updateLine).toHaveBeenCalledWith('i-1', 'l-1', {
      name: 'Posto Estrela',
      costCenter: 'cc-1',
      classification: 'cl-1',
    })
    expect(wrapper.emitted('close')).toEqual([[true]])
  })

  it('keeps the name when it is cleared', async () => {
    render(line())
    vi.mocked(importsApi.updateLine).mockResolvedValue(line())
    await flushPromises()

    await type('#import-line-name', '   ')
    dialogButton('Salvar').click()
    await flushPromises()

    expect(vi.mocked(importsApi.updateLine).mock.calls[0]![2]).toMatchObject({ name: undefined })
  })

  it('offers only the classifications of the type of the line', async () => {
    const wrapper = render(line({ value: 900 }))
    await flushPromises()

    const options = selects(wrapper)[2]!.props('options') as { label: string }[]
    expect(options.map((option) => option.label)).toEqual(['Freelas'])
    expect(dialog()!.textContent).toContain('Classificação de receita')
  })

  it('changes the action right away and puts the original one back when it is cancelled', async () => {
    const wrapper = render(line({ pending: ['cost-center'], costCenter: undefined }))
    vi.mocked(importsApi.updateLine).mockResolvedValue(line({ action: 'IGNORE' }))
    await flushPromises()

    await choose(wrapper, 0, 'IGNORE')

    expect(importsApi.updateLine).toHaveBeenCalledWith('i-1', 'l-1', { action: 'IGNORE' })
    expect(dialog()!.textContent).not.toContain('Centro de custo')

    dialogButton('Cancelar').click()
    await flushPromises()

    expect(vi.mocked(importsApi.updateLine).mock.calls[1]).toEqual([
      'i-1',
      'l-1',
      { action: 'CREATE', link: undefined, wallet: undefined },
    ])
    expect(wrapper.emitted('close')).toEqual([[true]])
  })

  it('puts back the link and the wallet of the line when the change of action is cancelled', async () => {
    const own = candidates[0]!
    const wrapper = render(
      line({ action: 'LINK', link: own, wallet: { id: 'w-2', name: 'Poupança' } }),
    )
    vi.mocked(importsApi.updateLine).mockResolvedValue(line({ action: 'CREATE' }))
    await flushPromises()

    await choose(wrapper, 0, 'CREATE')
    wrapper.findComponent(Dialog).vm.$emit('update:open', false)
    await flushPromises()

    expect(vi.mocked(importsApi.updateLine).mock.calls[1]).toEqual([
      'i-1',
      'l-1',
      { action: 'LINK', link: { kind: 'MOVEMENT', id: 'm-1' }, wallet: 'w-2' },
    ])
    expect(wrapper.emitted('close')).toEqual([[true]])
  })

  it('stays open with the error when the original action cannot be put back', async () => {
    const wrapper = render(line())
    vi.mocked(importsApi.updateLine)
      .mockResolvedValueOnce(line({ action: 'IGNORE' }))
      .mockRejectedValueOnce(problem(409, { error: 'import-not-editable' } as never))
    await flushPromises()
    await choose(wrapper, 0, 'IGNORE')

    dialogButton('Cancelar').click()
    await flushPromises()

    expect(dialog()!.textContent).toContain('A importação não é mais um rascunho')
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('ignores a change to the action that is already the chosen one', async () => {
    const wrapper = render(line())
    await flushPromises()

    await choose(wrapper, 0, 'CREATE')
    await choose(wrapper, 0, '')

    expect(importsApi.updateLine).not.toHaveBeenCalled()
  })

  it('closes when the dialog asks for it', async () => {
    const wrapper = render(line())
    await flushPromises()

    wrapper.findComponent(Dialog).vm.$emit('update:open', false)

    expect(wrapper.emitted('close')).toEqual([[false]])
  })

  it('closes with nothing changed when it is cancelled at once', async () => {
    const wrapper = render(line())
    await flushPromises()

    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    dialogButton('Cancelar').dispatchEvent(press)
    expect(press.defaultPrevented).toBe(true)
    dialogButton('Cancelar').click()
    await flushPromises()

    expect(wrapper.emitted('close')).toEqual([[false]])
  })

  it('links a line to one of the candidates and shows where it comes from', async () => {
    const wrapper = render(line({ pending: ['cost-center'], costCenter: undefined }))
    vi.mocked(importsApi.updateLine)
      .mockResolvedValueOnce(line({ action: 'LINK', pending: ['link'], costCenter: undefined }))
      .mockResolvedValueOnce(line({ action: 'LINK' }))
    await flushPromises()

    await choose(wrapper, 0, 'LINK')

    expect(importsApi.candidates).toHaveBeenCalledWith('i-1', 'l-1')
    expect(dialog()!.textContent).toContain('Lançamento')
    const options = selects(wrapper)[1]!.props('options') as { value: string; label: string }[]
    expect(options.map((option) => option.label.replace(/\s/g, ' '))).toEqual([
      'Seguro de vida · R$ 60,00',
      'Mensalidade · R$ 223,10 · Outubro',
    ])
    expect(document.body.querySelector('[data-slot="link-source"]')).toBeNull()

    await choose(wrapper, 1, 'MOVEMENT:m-2')
    expect(document.body.querySelector('[data-slot="link-source"]')!.textContent).toContain(
      'Pessoal · Mercado',
    )

    dialogButton('Salvar').click()
    await flushPromises()

    expect(vi.mocked(importsApi.updateLine).mock.calls[1]).toEqual([
      'i-1',
      'l-1',
      { name: 'Supermercado Boa Compra', link: { kind: 'MOVEMENT', id: 'm-2' } },
    ])
  })

  it('names the field after the action that links', async () => {
    const wrapper = render(line({ action: 'INVOICE_PAYMENT' }))
    await flushPromises()
    expect(dialog()!.textContent).toContain('Pagamento de fatura')

    await wrapper.setProps({ line: line({ id: 'l-2', action: 'LAUNCH_RECURRING' }) })
    await flushPromises()
    expect(dialog()!.textContent).toContain('Recorrente')
  })

  it('keeps the link that the line already has among the options and warns about the difference', async () => {
    const own = { ...candidates[0]!, id: 'm-7', name: 'Seguro antigo' }
    const wrapper = render(line({ action: 'LINK', link: own, differentValue: true }))
    await flushPromises()

    const options = selects(wrapper)[1]!.props('options') as { value: string }[]
    expect(options.map((option) => option.value)).toEqual([
      'MOVEMENT:m-7',
      'MOVEMENT:m-1',
      'MOVEMENT:m-2',
    ])
    expect(dialog()!.textContent?.replace(/\s/g, ' ')).toContain(
      'Lançado com 60,00, o arquivo tem 223,10',
    )
    expect(dialog()!.textContent).not.toContain('Vale o valor do arquivo.')
  })

  it('does not repeat the link of the line when it is also a candidate', async () => {
    const wrapper = render(line({ action: 'LINK', link: candidates[0] }))
    await flushPromises()

    const options = selects(wrapper)[1]!.props('options') as { value: string }[]
    expect(options.map((option) => option.value)).toEqual(['MOVEMENT:m-1', 'MOVEMENT:m-2'])
  })

  it('asks for the installments of a recurring to create', async () => {
    render(line({ action: 'CREATE_RECURRING', installment: 2, installments: 6 }))
    vi.mocked(importsApi.updateLine).mockResolvedValue(line())
    await flushPromises()

    expect(
      (document.body.querySelector('#import-line-installment') as HTMLInputElement).value,
    ).toBe('2')
    await type('#import-line-installment', '3')
    await type('#import-line-installments', '12')
    dialogButton('Salvar').click()
    await flushPromises()

    expect(importsApi.updateLine).toHaveBeenCalledWith('i-1', 'l-1', {
      name: 'Supermercado Boa Compra',
      costCenter: 'cc-1',
      classification: 'cl-1',
      installment: 3,
      installments: 12,
    })
  })

  it('sends no installments that were not filled', async () => {
    render(line({ action: 'CREATE_RECURRING', costCenter: undefined, classification: undefined }))
    vi.mocked(importsApi.updateLine).mockResolvedValue(line())
    await flushPromises()

    dialogButton('Salvar').click()
    await flushPromises()

    expect(importsApi.updateLine).toHaveBeenCalledWith('i-1', 'l-1', {
      name: 'Supermercado Boa Compra',
      costCenter: undefined,
      classification: undefined,
      installment: undefined,
      installments: undefined,
    })
  })

  it('chooses the wallet of a transfer', async () => {
    const wrapper = render(
      line({
        action: 'TRANSFER',
        pending: ['wallet'],
        allowedActions: ['CREATE', 'LINK', 'INVOICE_PAYMENT', 'TRANSFER', 'IGNORE'],
      }),
    )
    vi.mocked(importsApi.updateLine).mockResolvedValue(line())
    await flushPromises()

    await choose(wrapper, 1, 'w-2')
    dialogButton('Salvar').click()
    await flushPromises()

    expect(importsApi.updateLine).toHaveBeenCalledWith('i-1', 'l-1', {
      name: 'Supermercado Boa Compra',
      wallet: 'w-2',
    })
  })

  it('sends no wallet when the transfer has none chosen yet', async () => {
    render(line({ action: 'TRANSFER', pending: ['wallet'] }))
    vi.mocked(importsApi.updateLine).mockResolvedValue(line())
    await flushPromises()

    dialogButton('Salvar').click()
    await flushPromises()

    expect(importsApi.updateLine).toHaveBeenCalledWith('i-1', 'l-1', {
      name: 'Supermercado Boa Compra',
      wallet: undefined,
    })
  })

  it('shows the wallet already chosen for the transfer', async () => {
    const wrapper = render(line({ action: 'TRANSFER', wallet: { id: 'w-2', name: 'Poupança' } }))
    await flushPromises()

    expect(selects(wrapper)[1]!.props('modelValue')).toBe('w-2')
  })

  describe('with a compartment', () => {
    const compartmentCandidates = [
      { kind: 'COMPARTMENT', id: 'k-1', name: 'Reserva da casa', value: 1000, recurring: false },
      { kind: 'COMPARTMENT', id: 'k-2', name: 'IPTU 2027', value: 1050, recurring: false },
    ] as ImportCandidateView[]
    const WALLET_ACTIONS: ImportAction[] = ['CREATE', 'LINK', 'COMPARTMENT', 'IGNORE']

    beforeEach(() => {
      vi.mocked(importsApi.candidates).mockResolvedValue(compartmentCandidates)
    })

    it('lists the compartments with the balance and asks where to save a debit', async () => {
      const wrapper = render(
        line({ action: 'COMPARTMENT', pending: ['compartment'], allowedActions: WALLET_ACTIONS }),
      )
      await flushPromises()

      expect(importsApi.candidates).toHaveBeenCalledWith('i-1', 'l-1')
      const select = selects(wrapper)[1]!
      expect(select.props('label')).toBe('Guardar em')
      expect(select.props('options')).toEqual([
        { value: 'k-1', label: expect.stringContaining('Reserva da casa · ') },
        { value: 'k-2', label: expect.stringContaining('IPTU 2027 · ') },
      ])
      expect(dialog()!.textContent).not.toContain('Centro de custo')
    })

    it('asks where to withdraw from for a credit', async () => {
      const wrapper = render(
        line({ value: 50, action: 'COMPARTMENT', allowedActions: WALLET_ACTIONS }),
      )
      await flushPromises()

      expect(selects(wrapper)[1]!.props('label')).toBe('Resgatar de')
    })

    it('loads the compartments when the action is changed to it and saves the chosen one', async () => {
      const wrapper = render(line({ allowedActions: WALLET_ACTIONS }))
      vi.mocked(importsApi.updateLine).mockResolvedValue(
        line({ action: 'COMPARTMENT', allowedActions: WALLET_ACTIONS, pending: ['compartment'] }),
      )
      await flushPromises()

      await choose(wrapper, 0, 'COMPARTMENT')

      expect(importsApi.candidates).toHaveBeenCalledTimes(1)

      await choose(wrapper, 1, 'k-2')
      dialogButton('Salvar').click()
      await flushPromises()

      expect(importsApi.updateLine).toHaveBeenLastCalledWith('i-1', 'l-1', {
        name: 'Supermercado Boa Compra',
        compartment: 'k-2',
      })
    })

    it('shows the compartment already chosen and sends none when nothing is chosen', async () => {
      const chosen = { id: 'k-1', name: 'Reserva da casa', balance: 1000 }
      const wrapper = render(
        line({ action: 'COMPARTMENT', allowedActions: WALLET_ACTIONS, compartment: chosen }),
      )
      vi.mocked(importsApi.updateLine).mockResolvedValue(line())
      await flushPromises()

      expect(selects(wrapper)[1]!.props('modelValue')).toBe('k-1')

      await choose(wrapper, 1, '')
      dialogButton('Salvar').click()
      await flushPromises()

      expect(importsApi.updateLine).toHaveBeenCalledWith('i-1', 'l-1', {
        name: 'Supermercado Boa Compra',
        compartment: undefined,
      })
    })

    it('gives the compartment of the line back when the change of action is cancelled', async () => {
      const chosen = { id: 'k-1', name: 'Reserva da casa', balance: 1000 }
      const wrapper = render(
        line({ action: 'COMPARTMENT', allowedActions: WALLET_ACTIONS, compartment: chosen }),
      )
      vi.mocked(importsApi.updateLine).mockResolvedValue(line({ allowedActions: WALLET_ACTIONS }))
      await flushPromises()

      await choose(wrapper, 0, 'IGNORE')
      dialogButton('Cancelar').click()
      await flushPromises()

      expect(importsApi.updateLine).toHaveBeenLastCalledWith('i-1', 'l-1', {
        action: 'COMPARTMENT',
        link: undefined,
        wallet: undefined,
        compartment: 'k-1',
      })
    })

    it('shows the refusal of the balance next to the line', async () => {
      render(line({ action: 'COMPARTMENT', allowedActions: WALLET_ACTIONS }), 'Reserva da casa')
      await flushPromises()

      expect(dialog()!.querySelector('[data-slot="line-balance-error"]')!.textContent).toContain(
        'Passa do saldo de Reserva da casa',
      )
    })
  })

  it('says why a line is ignored and has no action to choose when only ignoring is possible', async () => {
    const wrapper = render(
      line({
        value: 50,
        action: 'IGNORE',
        allowedActions: ['IGNORE'],
        ignoreReason: { code: 'credit' },
      }),
    )
    await flushPromises()

    expect(dialog()!.textContent).toContain('Crédito sem compra')
    expect(dialog()!.textContent).not.toContain('Crédito do cartão')
    expect(document.body.querySelector('[data-slot="ignore-reason"]')).toBeNull()
    expect(selects(wrapper)).toHaveLength(0)
  })

  it('shows the error of the server inside the dialog and keeps it open', async () => {
    const wrapper = render(line())
    vi.mocked(importsApi.updateLine).mockRejectedValue(
      problem(400, { error: 'import-link-not-available' } as never),
    )
    await flushPromises()

    dialogButton('Salvar').click()
    await flushPromises()

    expect(dialog()!.textContent).toContain(
      'O lançamento escolhido não está mais disponível para esta linha',
    )
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('shows the error when the action cannot be changed and keeps the line as it was', async () => {
    const wrapper = render(line())
    vi.mocked(importsApi.updateLine).mockRejectedValue(
      problem(400, { error: 'import-action-not-allowed' } as never),
    )
    await flushPromises()

    await choose(wrapper, 0, 'IGNORE')

    expect(dialog()!.textContent).toContain('Essa ação não vale para este destino e esta linha')
    expect(dialog()!.textContent).toContain('Centro de custo')
    dialogButton('Cancelar').click()
    await flushPromises()
    expect(wrapper.emitted('close')).toEqual([[false]])
  })

  it('shows the error when the candidates cannot be loaded', async () => {
    vi.mocked(importsApi.candidates).mockRejectedValue(problem(500))
    render(line({ action: 'LINK' }))
    await flushPromises()

    expect(dialog()!.querySelector('[data-slot="server-error"]')).not.toBeNull()
  })

  it('starts clean when another line is opened after the first one', async () => {
    const wrapper = render(line())
    vi.mocked(importsApi.updateLine).mockRejectedValue(problem(500))
    await flushPromises()
    dialogButton('Salvar').click()
    await flushPromises()
    expect(dialog()!.querySelector('[data-slot="server-error"]')).not.toBeNull()

    await wrapper.setProps({ line: line({ id: 'l-2', name: 'Posto Estrela' }) })
    await flushPromises()

    expect(dialog()!.querySelector('[data-slot="server-error"]')).toBeNull()
    expect((document.body.querySelector('#import-line-name') as HTMLInputElement).value).toBe(
      'Posto Estrela',
    )
  })

  it('has nothing to fill once the line is gone', async () => {
    const wrapper = render(line())
    await flushPromises()

    await wrapper.setProps({ line: null })
    await flushPromises()

    expect(dialog()).toBeNull()
  })
})
