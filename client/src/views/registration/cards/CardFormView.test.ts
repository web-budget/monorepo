import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { walletsApi } from '@/api/wallets'
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
  active: true,
} as const

const debitCard: CardView = {
  id: 'k-1',
  name: 'Daily',
  lastFourDigits: '4321',
  type: 'DEBIT',
  active: true,
  flag: 'Elo',
  wallet,
  invoicePaymentDay: null,
}

const creditCard: CardView = {
  ...debitCard,
  id: 'k-2',
  name: 'Travel',
  type: 'CREDIT',
  wallet: null,
  invoicePaymentDay: 10,
}

function field(wrapper: Wrapper, name: string) {
  return wrapper.find(`[name="${name}"]`)
}

async function submit(wrapper: Wrapper) {
  await wrapper.find('form').trigger('submit')
  await settle()
}

async function chooseType(wrapper: Wrapper, type: string) {
  wrapper.getComponent(Select).vm.$emit('update:modelValue', type)
  await settle()
}

async function pickWallet(wrapper: Wrapper, query: string, optionText: string) {
  await wrapper.find('button[data-field="wallet"]').trigger('click')
  await settle()
  const search = document.body.querySelector<HTMLInputElement>(
    '[data-slot="popover-content"] input',
  )
  search!.value = query
  search!.dispatchEvent(new Event('input'))
  await settle()
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

  it('asks for the required fields', async () => {
    const { wrapper } = await mountView(CardFormView, 'cards')

    expect(wrapper.text()).toContain('Novo cartão')
    await submit(wrapper)

    expect(wrapper.text()).toContain('Campo obrigatório')
    expect(cardsApi.create).not.toHaveBeenCalled()
  })

  it('locks the wallet for a credit card and the invoice day for a debit card', async () => {
    const { wrapper } = await mountView(CardFormView, 'cards')

    expect(field(wrapper, 'invoicePaymentDay').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('button[data-field="wallet"]').attributes('disabled')).toBeUndefined()

    await chooseType(wrapper, 'CREDIT')
    expect(wrapper.find('button[data-field="wallet"]').attributes('disabled')).toBeDefined()
    expect(field(wrapper, 'invoicePaymentDay').attributes('disabled')).toBeUndefined()

    await chooseType(wrapper, 'DEBIT')
    expect(wrapper.find('button[data-field="wallet"]').attributes('disabled')).toBeUndefined()
    expect(field(wrapper, 'invoicePaymentDay').attributes('disabled')).toBeDefined()
  })

  it('creates a credit card and clears the form', async () => {
    vi.mocked(cardsApi.create).mockResolvedValue(undefined)
    const { wrapper } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Travel')
    await chooseType(wrapper, 'CREDIT')
    await field(wrapper, 'invoicePaymentDay').setValue('10')
    await field(wrapper, 'lastFourDigits').setValue('1234')
    await field(wrapper, 'flag').setValue('Visa')
    await submit(wrapper)

    expect(cardsApi.create).toHaveBeenCalledWith({
      name: 'Travel',
      type: 'CREDIT',
      lastFourDigits: '1234',
      flag: 'Visa',
      wallet: null,
      invoicePaymentDay: 10,
    })
    expect(toast.success).toHaveBeenCalledWith('Registro criado', {
      description: 'Cartão criado com sucesso',
      duration: 4000,
    })
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('')
  })

  it('creates a debit card linked to a wallet found by name', async () => {
    vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf([wallet]))
    vi.mocked(cardsApi.create).mockResolvedValue(undefined)
    const { wrapper } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Daily')
    await chooseType(wrapper, 'DEBIT')
    await pickWallet(wrapper, 'Ma', 'Main')
    await field(wrapper, 'lastFourDigits').setValue('4321')
    await submit(wrapper)

    expect(walletsApi.findAll).toHaveBeenCalledWith({ filter: 'Ma', status: 'ACTIVE' })
    expect(cardsApi.create).toHaveBeenCalledWith({
      name: 'Daily',
      type: 'DEBIT',
      lastFourDigits: '4321',
      flag: null,
      wallet: 'w-1',
      invoicePaymentDay: null,
    })
  })

  it('rejects an invoice day outside the month', async () => {
    const { wrapper } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Travel')
    await chooseType(wrapper, 'CREDIT')
    await field(wrapper, 'invoicePaymentDay').setValue('31')
    await field(wrapper, 'lastFourDigits').setValue('1234')
    await submit(wrapper)

    expect(wrapper.text()).toContain('O valor máximo é 30')
    expect(cardsApi.create).not.toHaveBeenCalled()
  })

  it('shows the server error inside the form', async () => {
    vi.mocked(cardsApi.create).mockRejectedValue(
      problem(400, { error: 'debit-card-without-wallet' }),
    )
    const { wrapper } = await mountView(CardFormView, 'cards')

    await field(wrapper, 'name').setValue('Daily')
    await chooseType(wrapper, 'DEBIT')
    await field(wrapper, 'lastFourDigits').setValue('4321')
    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'O cartão de débito deve estar vinculado a uma carteira',
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('loads a debit card for editing with the type locked', async () => {
    vi.mocked(cardsApi.findById).mockResolvedValue(debitCard)

    const { wrapper } = await mountView(CardFormView, 'cards', { id: 'k-1' })

    expect(wrapper.text()).toContain('Editando cartão')
    expect((field(wrapper, 'name').element as HTMLInputElement).value).toBe('Daily')
    expect((field(wrapper, 'lastFourDigits').element as HTMLInputElement).value).toBe('4321')
    expect(wrapper.find('button[data-field="wallet"]').text()).toContain('Main')
    expect(wrapper.find('button[role="combobox"]').attributes('disabled')).toBeDefined()
    expect(field(wrapper, 'invoicePaymentDay').attributes('disabled')).toBeDefined()
  })

  it('saves the changes of a credit card and its status', async () => {
    vi.mocked(cardsApi.findById).mockResolvedValue(creditCard)
    vi.mocked(cardsApi.update).mockResolvedValue(creditCard)
    const { wrapper } = await mountView(CardFormView, 'cards', { id: 'k-2' })

    await field(wrapper, 'invoicePaymentDay').setValue('15')
    await buttonWithText(wrapper, 'Inativo').trigger('click')
    await submit(wrapper)

    expect(cardsApi.update).toHaveBeenCalledWith('k-2', {
      name: 'Travel',
      active: false,
      lastFourDigits: '4321',
      flag: 'Elo',
      wallet: null,
      invoicePaymentDay: 15,
    })
    expect(toast.success).toHaveBeenCalledWith('Registro atualizado', {
      description: 'Cartão atualizado com sucesso',
      duration: 4000,
    })
  })

  it('shows the server error when the update is rejected', async () => {
    vi.mocked(cardsApi.findById).mockResolvedValue(creditCard)
    vi.mocked(cardsApi.update).mockRejectedValue(problem(422))
    const { wrapper } = await mountView(CardFormView, 'cards', { id: 'k-2' })

    await submit(wrapper)

    expect(wrapper.find('[data-slot="server-error"]').text()).toContain(
      'Revise os dados e tente novamente',
    )
  })

  it('goes back to the listing', async () => {
    const { wrapper, router } = await mountView(CardFormView, 'cards')

    await buttonWithText(wrapper, 'Voltar').trigger('click')
    await settle()

    expect(router.currentRoute.value.name).toBe('cards')
  })
})
