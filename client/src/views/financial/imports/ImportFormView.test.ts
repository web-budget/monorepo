import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { importsApi } from '@/api/imports'
import { invoicesApi } from '@/api/invoices'
import { walletsApi } from '@/api/wallets'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import { buttonWithText, mountView, namedTestRoutes, pageOf, problem, settle } from '@/test/crud'
import type { CardListView, FinancialPeriodListView, ImportListView, WalletListView } from '@/types'
import ImportFormScreen from '@/views/financial/imports/ImportFormView.vue'

vi.mock('@/api/imports')
vi.mock('@/api/invoices')
vi.mock('@/api/cards')
vi.mock('@/api/wallets')
vi.mock('@/api/financialPeriods')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const periods = [
  {
    id: 'p-12',
    name: 'Dezembro de 2026',
    startingAt: '2026-12-01',
    endingAt: '2026-12-31',
    status: 'OPEN',
    expired: false,
  },
  {
    id: 'p-11',
    name: 'Novembro de 2026',
    startingAt: '2026-11-01',
    endingAt: '2026-11-30',
    status: 'OPEN',
    expired: false,
  },
  {
    id: 'p-10',
    name: 'Outubro de 2026',
    startingAt: '2026-10-01',
    endingAt: '2026-10-31',
    status: 'OPEN',
    expired: true,
  },
  {
    id: 'p-9',
    name: 'Setembro de 2026',
    startingAt: '2026-09-01',
    endingAt: '2026-09-30',
    status: 'CLOSED',
    expired: false,
  },
] as FinancialPeriodListView[]

const cards = [
  { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '4821' },
  { id: 'c-2', name: 'Cartão Loja', lastFourDigits: '0932' },
] as CardListView[]

const wallets = [
  { id: 'w-1', name: 'Conta corrente', type: 'BANK_ACCOUNT' },
  { id: 'w-2', name: 'Carteira física', type: 'PERSONAL' },
  { id: 'w-3', name: 'Poupança', type: 'INVESTMENT' },
] as WalletListView[]

function serve() {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(
    pageOf(periods.filter((p) => p.status === 'OPEN')),
  )
  vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf(cards))
  vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf(wallets))
  vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([{ id: 'i-1' }] as never[]))
  vi.mocked(importsApi.findAll).mockResolvedValue(pageOf([]))
  vi.mocked(importsApi.create).mockResolvedValue({ id: 'new-1' })
}

async function render(location?: string) {
  serve()
  return mountView(ImportFormScreen, 'imports', {}, {}, location, namedTestRoutes('invoices'))
}

async function chooseFile(wrapper: Awaited<ReturnType<typeof render>>['wrapper'], file: File) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

const ofx = new File([new Uint8Array(18432)], 'fatura-visa-novembro.ofx')

function sendButton(wrapper: Awaited<ReturnType<typeof render>>['wrapper']) {
  return buttonWithText(wrapper, 'Importar')
}

describe('ImportFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 26))
  })

  it('opens on a card import, with the first card and the period that contains today', async () => {
    const { wrapper } = await render()
    const [destination, period] = wrapper.findAllComponents(FilterSelect)

    expect(wrapper.find('h1').text()).toBe('Nova importação')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Campos com * são obrigatórios.',
    )
    expect(destination!.props('modelValue')).toBe('c-1')
    expect(destination!.props('label')).toBe('Cartão')
    expect(period!.props('modelValue')).toBe('p-11')
    expect(period!.props('options')).toEqual([
      { value: 'p-12', label: 'Dezembro de 2026' },
      { value: 'p-11', label: 'Novembro de 2026' },
      { value: 'p-10', label: 'Outubro de 2026 · expirado' },
    ])
    expect(wrapper.text()).not.toContain('Tudo o que for criado entra neste período.')
    expect(wrapper.find('[data-slot="drop-area"]').text()).toContain(
      'Arraste o arquivo ou clique para escolher',
    )
    expect(sendButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('marks the card or wallet and the period as required', async () => {
    const card = await render()
    const [cardSelect, cardPeriod] = card.wrapper.findAllComponents(FilterSelect)

    expect(cardSelect!.props('required')).toBe(true)
    expect(cardSelect!.text()).toContain('*')
    expect(cardPeriod!.props('required')).toBe(true)
    expect(cardPeriod!.text()).toContain('*')

    const wallet = await render('/imports/create?wallet=w-1')
    const [walletSelect] = wallet.wrapper.findAllComponents(FilterSelect)

    expect(walletSelect!.props('required')).toBe(true)
    expect(walletSelect!.text()).toContain('*')
  })

  it('opens with the destination and the period of the URL', async () => {
    const { wrapper } = await render('/imports/create?card=c-2&period=p-10')
    const [destination, period] = wrapper.findAllComponents(FilterSelect)

    expect(destination!.props('modelValue')).toBe('c-2')
    expect(period!.props('modelValue')).toBe('p-10')
  })

  it('opens on the statement of a wallet, leaving out the personal wallets', async () => {
    const { wrapper } = await render('/imports/create?wallet=w-3&period=p-12')
    const [destination, period] = wrapper.findAllComponents(FilterSelect)

    expect(destination!.props('label')).toBe('Carteira')
    expect(destination!.props('modelValue')).toBe('w-3')
    expect(destination!.props('options')).toEqual([
      { value: 'w-1', label: 'Conta corrente' },
      { value: 'w-3', label: 'Poupança' },
    ])
    expect(period!.props('modelValue')).toBe('p-12')
  })

  it('falls back to the first destination when the one asked for does not exist', async () => {
    const { wrapper } = await render('/imports/create?wallet=nope')
    const [destination] = wrapper.findAllComponents(FilterSelect)

    expect(destination!.props('modelValue')).toBe('w-1')
  })

  it('has no destination or period when there is none to choose', async () => {
    serve()
    vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf([]))
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf([]))
    vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf([]))

    const { wrapper } = await mountView(ImportFormScreen, 'imports')
    const [destination, period] = wrapper.findAllComponents(FilterSelect)

    expect(destination!.props('modelValue')).toBe('')
    expect(period!.props('modelValue')).toBe('')

    await buttonWithText(wrapper, 'Extrato de carteira').trigger('click')
    await flushPromises()

    expect(wrapper.findAllComponents(FilterSelect)[0]!.props('modelValue')).toBe('')
  })

  it('switches between the invoice of a card and the statement of a wallet', async () => {
    const { wrapper } = await render()

    await buttonWithText(wrapper, 'Extrato de carteira').trigger('click')
    await flushPromises()

    expect(wrapper.findAllComponents(FilterSelect)[0]!.props('label')).toBe('Carteira')
    expect(invoicesApi.findAll).toHaveBeenCalledTimes(1)

    await buttonWithText(wrapper, 'Fatura de cartão').trigger('click')
    await flushPromises()

    expect(wrapper.findAllComponents(FilterSelect)[0]!.props('label')).toBe('Cartão')
  })

  it('changes the card, the wallet and the period', async () => {
    const { wrapper } = await render()

    wrapper.findAllComponents(FilterSelect)[0]!.vm.$emit('update:modelValue', 'c-2')
    wrapper.findAllComponents(FilterSelect)[1]!.vm.$emit('update:modelValue', 'p-12')
    await flushPromises()

    expect(invoicesApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ card: 'c-2', financialPeriod: 'p-12' }),
    )

    await buttonWithText(wrapper, 'Extrato de carteira').trigger('click')
    await flushPromises()
    wrapper.findAllComponents(FilterSelect)[0]!.vm.$emit('update:modelValue', 'w-3')
    await flushPromises()

    expect(importsApi.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ wallet: 'w-3', financialPeriod: 'p-12' }),
    )
  })

  it('shows the chosen file with its size and lets the user replace it', async () => {
    const { wrapper } = await render()

    await chooseFile(wrapper, ofx)

    const chosen = wrapper.find('[data-slot="chosen-file"]')
    expect(chosen.text()).toContain('fatura-visa-novembro.ofx')
    expect(chosen.text()).toContain('OFX · 18 KB')
    expect(wrapper.find('[data-slot="drop-area"]').exists()).toBe(false)
    expect(sendButton(wrapper).attributes('disabled')).toBeUndefined()

    await wrapper.find('button[aria-label="Trocar o arquivo"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-slot="chosen-file"]').exists()).toBe(false)
    expect(sendButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('opens the file picker from the drop area and ignores a picker that chose nothing', async () => {
    const { wrapper } = await render()
    const click = vi.spyOn(wrapper.find('input[type="file"]').element as HTMLInputElement, 'click')

    await wrapper.find('[data-slot="drop-area"]').trigger('click')
    expect(click).toHaveBeenCalled()

    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [], configurable: true })
    await input.trigger('change')

    expect(wrapper.find('[data-slot="chosen-file"]').exists()).toBe(false)
  })

  it('warns that the card has no open invoice before sending, and blocks the import', async () => {
    serve()
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([]))
    const { wrapper, router } = await mountView(
      ImportFormScreen,
      'imports',
      {},
      {},
      undefined,
      namedTestRoutes('invoices'),
    )
    await chooseFile(wrapper, ofx)

    const alert = wrapper.find('[data-slot="no-invoice"]')
    expect(alert.text()).toContain(
      'Não há fatura aberta de Visa Platinum ••4821 em Novembro de 2026',
    )
    expect(alert.text()).toContain('Escolha outro período ou abra a fatura.')
    expect(sendButton(wrapper).attributes('disabled')).toBeDefined()

    await buttonWithText(wrapper, 'Ver faturas').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('invoices')
    expect(router.currentRoute.value.query).toEqual({ card: 'c-1', period: 'p-11' })
  })

  it('warns that a draft already exists for the destination and the period', async () => {
    serve()
    vi.mocked(importsApi.findAll).mockResolvedValue(
      pageOf([
        {
          id: 'd-1',
          status: 'READY',
          target: 'CARD',
          card: { id: 'c-1', name: 'Visa Platinum', lastFourDigits: '4821' },
          financialPeriod: { id: 'p-11', name: 'Novembro de 2026' },
        },
      ] as ImportListView[]),
    )
    const { wrapper, router } = await mountView(ImportFormScreen, 'imports')
    await chooseFile(wrapper, ofx)

    const alert = wrapper.find('[data-slot="draft-exists"]')
    expect(alert.text()).toContain(
      'Já existe um rascunho de Visa Platinum ••4821 em Novembro de 2026',
    )
    expect(alert.text()).toContain('Termine ou descarte o que está aberto.')
    expect(sendButton(wrapper).attributes('disabled')).toBeDefined()

    await buttonWithText(wrapper, 'Abrir rascunho').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('imports.detail')
    expect(router.currentRoute.value.params.id).toBe('d-1')
  })

  it('says a wallet import in processing and names the wallet', async () => {
    serve()
    vi.mocked(importsApi.findAll).mockResolvedValue(
      pageOf([
        {
          id: 'd-2',
          status: 'PROCESSING',
          wallet: { id: 'w-1', name: 'Conta corrente' },
          financialPeriod: { id: 'p-11', name: 'Novembro de 2026' },
        },
      ] as ImportListView[]),
    )
    const { wrapper } = await mountView(
      ImportFormScreen,
      'imports',
      {},
      {},
      '/imports/create?wallet=w-1',
    )

    expect(wrapper.find('[data-slot="draft-exists"]').text()).toContain(
      'Já existe uma importação em processamento de Conta corrente em Novembro de 2026',
    )
  })

  it('sends the file, shows the toast and goes to the import', async () => {
    const { wrapper, router } = await render()
    await chooseFile(wrapper, ofx)

    await wrapper.find('form').trigger('submit')
    await settle()

    const form = vi.mocked(importsApi.create).mock.calls[0]![0]
    expect(form.get('card')).toBe('c-1')
    expect(form.get('financialPeriod')).toBe('p-11')
    expect((form.get('file') as File).name).toBe('fatura-visa-novembro.ofx')
    expect(toast.success).toHaveBeenCalledWith('Importação enviada', expect.anything())
    expect(router.currentRoute.value.name).toBe('imports.detail')
    expect(router.currentRoute.value.params.id).toBe('new-1')
  })

  it('shows the server error and stays on the form', async () => {
    const { wrapper, router } = await render()
    vi.mocked(importsApi.create).mockRejectedValue(problem(400, { error: 'bad-request' }))
    await chooseFile(wrapper, ofx)

    await wrapper.find('form').trigger('submit')
    await settle()

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    expect(router.currentRoute.value.name).not.toBe('imports.detail')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('does not send without the file', async () => {
    const { wrapper } = await render()

    await wrapper.find('form').trigger('submit')
    await settle()

    expect(importsApi.create).not.toHaveBeenCalled()
  })

  it('goes back to the list with Cancelar', async () => {
    const { wrapper, router } = await render()

    await buttonWithText(wrapper, 'Cancelar').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('imports')
  })

  it('shows the server error when the options cannot be loaded', async () => {
    serve()
    vi.mocked(cardsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(ImportFormScreen, 'imports')

    expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
  })
})
