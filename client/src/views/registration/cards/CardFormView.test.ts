import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { walletsApi } from '@/api/wallets'
import { buttonWithText, mountView, pageOf, problem, settle } from '@/test/crud'
import type { CardView } from '@/types'
import CardFormView from '@/views/registration/cards/CardFormView.vue'

vi.mock('@/api/cards')
vi.mock('@/api/wallets')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

type Wrapper = Awaited<ReturnType<typeof mountView>>['wrapper']

const wallet = {
  id: 'w-1',
  name: 'Main',
  type: 'BANK_ACCOUNT',
  bank: 'ACME',
  active: true,
} as const

const card: CardView = {
  id: 'k-1',
  name: 'Travel',
  lastFourDigits: '4321',
  active: true,
  flag: 'Elo',
  wallet,
  invoicePaymentDay: 10,
}

function field(wrapper: Wrapper, name: string) {
  return wrapper.find(`[name="${name}"]`)
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

async function searchWallet(wrapper: Wrapper, query: string) {
  await wrapper.find('button[data-field="wallet"]').trigger('click')
  await settle()
  const search = document.body.querySelector<HTMLInputElement>(
    '[data-slot="popover-content"] input',
  )
  search!.value = query
  search!.dispatchEvent(new Event('input'))
  await settle()
}

async function pickWallet(wrapper: Wrapper, query: string, optionText: string) {
  await searchWallet(wrapper, query)
  const option = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent?.trim() === optionText,
  )
  option!.click()
  await settle()
}

describe('CardFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
  })

  it('shows the title, the sections, the required marks and asks for the required fields', async () => {
    const { wrapper } = await mountView(CardFormView, 'cards')

    expect(wrapper.find('h1').text()).toBe('Novo cartão')
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Identificação', 'Fatura'])
    expect(wrapper.find('button[data-field="wallet"]').exists()).toBe(true)
    expect(buttonWithText(wrapper, 'Criar')).toBeDefined()
    expect(wrapper.findAll('label').filter((label) => label.text().endsWith('*'))).toHaveLength(3)

    await submit(wrapper)

    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(cardsApi.create).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(field(wrapper, 'name').element)
  })

  it('creates a card without a wallet and stays on the cleared form', async () => {
    vi.mocked(cardsApi.create).mockResolvedValue('k-9')
    const { wrapper, router } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Travel')
    await field(wrapper, 'invoicePaymentDay').setValue('10')
    await field(wrapper, 'lastFourDigits').setValue('1234')
    await field(wrapper, 'flag').setValue('Visa')
    await submit(wrapper)

    expect(cardsApi.create).toHaveBeenCalledWith({
      name: 'Travel',
      lastFourDigits: '1234',
      flag: 'Visa',
      wallet: null,
      invoicePaymentDay: 10,
    })
    expect(toast.success).toHaveBeenCalledWith('Cartão criado', {
      description: '“Travel” já aparece nos lançamentos.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).not.toBe('cards.detail')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(field(wrapper, 'name').element)
  })

  it('creates a card linked to the wallet that pays the invoice, found by name', async () => {
    vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf([wallet]))
    vi.mocked(cardsApi.create).mockResolvedValue('k-9')
    const { wrapper } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Daily')
    await field(wrapper, 'invoicePaymentDay').setValue('5')
    await pickWallet(wrapper, 'Ma', 'Main')
    await field(wrapper, 'lastFourDigits').setValue('4321')
    await submit(wrapper)

    expect(walletsApi.findAll).toHaveBeenCalledWith({ filter: 'Ma', status: 'ACTIVE' })
    expect(cardsApi.create).toHaveBeenCalledWith({
      name: 'Daily',
      lastFourDigits: '4321',
      flag: null,
      wallet: 'w-1',
      invoicePaymentDay: 5,
    })
  })

  it('rejects an invoice day outside the month', async () => {
    const { wrapper } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Travel')
    await field(wrapper, 'invoicePaymentDay').setValue('31')
    await field(wrapper, 'lastFourDigits').setValue('1234')
    await submit(wrapper)

    expect(wrapper.text()).toContain('O valor máximo é 30')
    expect(cardsApi.create).not.toHaveBeenCalled()
  })

  it('shows the server error inside the form', async () => {
    vi.mocked(cardsApi.create).mockRejectedValue(problem(400, { error: 'inactive-wallet' }))
    const { wrapper } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Daily')
    await field(wrapper, 'invoicePaymentDay').setValue('5')
    await field(wrapper, 'lastFourDigits').setValue('4321')
    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain('A carteira está inativa')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('marks the field the server says is already in use', async () => {
    vi.mocked(cardsApi.create).mockRejectedValue(
      problem(409, { error: 'conflict', parameters: { 'card.last-four-digits': '1234' } }),
    )
    const { wrapper } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Travel')
    await field(wrapper, 'invoicePaymentDay').setValue('10')
    await field(wrapper, 'lastFourDigits').setValue('1234')
    await submit(wrapper)

    expect(field(wrapper, 'lastFourDigits').attributes('aria-invalid')).toBe('true')
    expect(field(wrapper, 'name').attributes('aria-invalid')).toBe('false')
  })

  it('puts the status block first on edit, with its help and the switch', async () => {
    vi.mocked(cardsApi.findById).mockResolvedValue(card)

    const { wrapper } = await mountView(CardFormView, 'cards', { id: 'k-1' })

    const sections = wrapper.findAll('form section')
    expect(sections.length).toBeGreaterThan(1)
    expect(sections[0]?.find('h2').text()).toBe('Situação')
    expect(sections[0]?.text()).toContain('Inativar para remover das listagens')
    expect(sections[0]?.text()).toContain('Ativo')
    expect(sections[0]?.find('button[role="switch"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.findAll('button[role="switch"]')).toHaveLength(1)
  })

  it('has no status block on create: a new record is always active', async () => {
    const { wrapper } = await mountView(CardFormView, 'cards')

    expect(wrapper.findAll('form section h2').map((title) => title.text())).not.toContain(
      'Situação',
    )
    expect(wrapper.text()).not.toContain('Inativar para')
  })

  it('loads a card for editing', async () => {
    vi.mocked(cardsApi.findById).mockResolvedValue(card)

    const { wrapper } = await mountView(CardFormView, 'cards', { id: 'k-1' })

    expect(wrapper.find('h1').text()).toBe('Editando cartão')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe('Travel')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Travel')
    expect((field(wrapper, 'lastFourDigits').element as HTMLInputElement).value).toBe('4321')
    expect((field(wrapper, 'invoicePaymentDay').element as HTMLInputElement).value).toBe('10')
    expect(wrapper.find('button[data-field="wallet"]').text()).toContain('Main')
  })

  it('saves the changes of a card and its status, and goes to the detail', async () => {
    vi.mocked(cardsApi.findById).mockResolvedValue({ ...card, wallet: null })
    vi.mocked(cardsApi.update).mockResolvedValue(card)
    const { wrapper, router } = await mountView(CardFormView, 'cards', { id: 'k-1' })

    await field(wrapper, 'invoicePaymentDay').setValue('15')
    await wrapper.find('button[role="switch"]').trigger('click')
    await submit(wrapper)

    expect(cardsApi.update).toHaveBeenCalledWith('k-1', {
      name: 'Travel',
      active: false,
      lastFourDigits: '4321',
      flag: 'Elo',
      wallet: null,
      invoicePaymentDay: 15,
    })
    expect(toast.success).toHaveBeenCalledWith('Alterações salvas', {
      description: '“Travel” foi atualizado.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).toBe('cards.detail')
  })

  it('shows the server error when the update is rejected', async () => {
    vi.mocked(cardsApi.findById).mockResolvedValue(card)
    vi.mocked(cardsApi.update).mockRejectedValue(problem(422))
    const { wrapper } = await mountView(CardFormView, 'cards', { id: 'k-1' })

    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Revise os dados e tente novamente',
    )
  })

  it('shows the server error when the wallet search fails', async () => {
    vi.mocked(walletsApi.findAll).mockRejectedValue(problem(500))
    const { wrapper } = await mountView(CardFormView, 'cards')

    await searchWallet(wrapper, 'Ma')

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Tente novamente mais tarde',
    )
  })

  it('goes back to the listing with Cancelar', async () => {
    const { wrapper, router } = await mountView(CardFormView, 'cards')

    await buttonWithText(wrapper, 'Cancelar').trigger('click')
    await settle()

    expect(router.currentRoute.value.name).toBe('cards')
  })
})
