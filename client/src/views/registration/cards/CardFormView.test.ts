import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { walletsApi } from '@/api/wallets'
import SelectField from '@/components/forms/SelectField.vue'
import { Select } from '@/components/ui/select'
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
  currentBalance: 0,
  agency: null,
  number: null,
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

function selects(wrapper: Wrapper) {
  return wrapper.findAllComponents(Select)
}

function options(wrapper: Wrapper, index: number) {
  return wrapper.findAllComponents(SelectField)[index]!.props('options')
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

describe('CardFormView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf([wallet]))
  })

  it('shows the title, the credit-only note, the sections, the examples and the required marks', async () => {
    const { wrapper } = await mountView(CardFormView, 'cards')

    expect(wrapper.find('h1').text()).toBe('Novo cartão')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
      'Só cartão de crédito. Campos com * são obrigatórios.',
    )
    expect(wrapper.findAll('h2').map((title) => title.text())).toEqual(['Identificação', 'Fatura'])
    expect(wrapper.text()).toContain('Usados como sugestão ao pagar a fatura fechada.')
    expect(wrapper.text()).toContain('Vem sugerida ao pagar; dá para trocar na hora.')
    expect(field(wrapper, 'name').attributes('placeholder')).toBe('Ex.: Visa Platinum')
    expect(field(wrapper, 'lastFourDigits').attributes('placeholder')).toBe('0000')
    expect(buttonWithText(wrapper, 'Criar')).toBeDefined()
    expect(wrapper.findAll('label').filter((label) => label.text().endsWith('*'))).toHaveLength(3)
    expect((field(wrapper, 'invoicePaymentDay').element as HTMLInputElement).value).toBe('10')
  })

  it('offers the flags in a select that starts on Visa, and the active wallets', async () => {
    const { wrapper } = await mountView(CardFormView, 'cards')

    expect(options(wrapper, 0).map((option) => option.label)).toEqual([
      'Visa',
      'Mastercard',
      'Elo',
      'American Express',
    ])
    expect(selects(wrapper)[0]!.props('modelValue')).toBe('Visa')
    expect(walletsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'name,asc' }),
    )
    expect(options(wrapper, 1)).toEqual([{ value: 'w-1', label: 'Main' }])
    expect(selects(wrapper)[1]!.props('modelValue')).toBe('__none__')
  })

  it('asks for the required fields', async () => {
    const { wrapper } = await mountView(CardFormView, 'cards')

    await submit(wrapper)

    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(cardsApi.create).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(field(wrapper, 'name').element)
  })

  it('creates a card without a wallet and stays on the cleared form', async () => {
    vi.mocked(cardsApi.create).mockResolvedValue('k-9')
    const { wrapper, router } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Travel')
    await field(wrapper, 'lastFourDigits').setValue('1234')
    await submit(wrapper)

    expect(cardsApi.create).toHaveBeenCalledWith({
      name: 'Travel',
      lastFourDigits: '1234',
      flag: 'Visa',
      wallet: null,
      invoicePaymentDay: 10,
    })
    expect(toast.success).toHaveBeenCalledWith('Cartão criado', {
      description: 'Ele ganha uma fatura aberta em cada período aberto.',
      duration: 4000,
    })
    expect(router.currentRoute.value.name).not.toBe('cards.detail')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
    expect((field(wrapper, 'invoicePaymentDay').element as HTMLInputElement).value).toBe('10')
    expect(document.activeElement).toBe(field(wrapper, 'name').element)
  })

  it('creates a card with the chosen flag and the wallet that pays the invoice', async () => {
    vi.mocked(cardsApi.create).mockResolvedValue('k-9')
    const { wrapper } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Daily')
    await field(wrapper, 'invoicePaymentDay').setValue('5')
    selects(wrapper)[0]!.vm.$emit('update:modelValue', 'Mastercard')
    selects(wrapper)[1]!.vm.$emit('update:modelValue', 'w-1')
    await field(wrapper, 'lastFourDigits').setValue('4321')
    await submit(wrapper)

    expect(cardsApi.create).toHaveBeenCalledWith({
      name: 'Daily',
      lastFourDigits: '4321',
      flag: 'Mastercard',
      wallet: 'w-1',
      invoicePaymentDay: 5,
    })
  })

  it('goes back to no suggested wallet when that option is chosen again', async () => {
    vi.mocked(cardsApi.create).mockResolvedValue('k-9')
    const { wrapper } = await mountView(CardFormView, 'cards')

    selects(wrapper)[1]!.vm.$emit('update:modelValue', 'w-1')
    await settle()
    selects(wrapper)[1]!.vm.$emit('update:modelValue', '__none__')
    await field(wrapper, 'name').setValue('Daily')
    await field(wrapper, 'lastFourDigits').setValue('4321')
    await submit(wrapper)

    expect(cardsApi.create).toHaveBeenCalledWith(expect.objectContaining({ wallet: null }))
  })

  it('requires the payment day, and rejects one outside the month', async () => {
    const { wrapper } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Travel')
    await field(wrapper, 'lastFourDigits').setValue('1234')
    await field(wrapper, 'invoicePaymentDay').setValue('')
    await submit(wrapper)
    expect(wrapper.text()).toContain('Valor inválido')

    await field(wrapper, 'invoicePaymentDay').setValue('31')
    await submit(wrapper)

    expect(wrapper.text()).toContain('O valor máximo é 30')
    expect(cardsApi.create).not.toHaveBeenCalled()
  })

  it('shows the server error inside the form', async () => {
    vi.mocked(cardsApi.create).mockRejectedValue(problem(400, { error: 'inactive-wallet' }))
    const { wrapper } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Daily')
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

  it('loads a card for editing, keeping a flag and a wallet that are not on the lists', async () => {
    vi.mocked(cardsApi.findById).mockResolvedValue({
      ...card,
      flag: 'Hipercard',
      wallet: { ...wallet, id: 'w-9', name: 'Old wallet', active: false },
    })

    const { wrapper } = await mountView(CardFormView, 'cards', { id: 'k-1' })

    expect(wrapper.find('h1').text()).toBe('Editar cartão')
    expect(wrapper.find('[data-slot="page-description"]').text()).toBe('Travel')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Travel')
    expect((field(wrapper, 'lastFourDigits').element as HTMLInputElement).value).toBe('4321')
    expect((field(wrapper, 'invoicePaymentDay').element as HTMLInputElement).value).toBe('10')
    expect(options(wrapper, 0).map((option) => option.label)).toContain('Hipercard')
    expect(selects(wrapper)[0]!.props('modelValue')).toBe('Hipercard')
    expect(options(wrapper, 1).map((option) => option.label)).toEqual(['Main', 'Old wallet'])
    expect(selects(wrapper)[1]!.props('modelValue')).toBe('w-9')
  })

  it('does not repeat the wallet of the card when it is already among the active ones', async () => {
    vi.mocked(cardsApi.findById).mockResolvedValue(card)

    const { wrapper } = await mountView(CardFormView, 'cards', { id: 'k-1' })

    expect(options(wrapper, 1)).toEqual([{ value: 'w-1', label: 'Main' }])
    expect(selects(wrapper)[1]!.props('modelValue')).toBe('w-1')
  })

  it('does not offer the wallet of a card seen before when creating a new one', async () => {
    const { wrapper } = await mountView(
      CardFormView,
      'cards',
      {},
      {
        cards: {
          card: { ...card, wallet: { ...wallet, id: 'w-9', name: 'Old wallet', active: false } },
        },
      },
    )

    expect(options(wrapper, 1)).toEqual([{ value: 'w-1', label: 'Main' }])
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

  it('shows the server error when the wallets cannot be loaded', async () => {
    vi.mocked(walletsApi.findAll).mockRejectedValue(problem(500))

    const { wrapper } = await mountView(CardFormView, 'cards')

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
