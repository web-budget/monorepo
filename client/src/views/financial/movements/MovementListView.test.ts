import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { cardsApi } from '@/api/cards'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { movementsApi } from '@/api/movements'
import { walletsApi } from '@/api/wallets'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import PayMovementDialog from '@/components/movements/PayMovementDialog.vue'
import UndoPaymentDialog from '@/components/movements/UndoPaymentDialog.vue'
import { Switch } from '@/components/ui/switch'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import {
  buttonWithText,
  chooseRowAction,
  mountView,
  pageOf,
  problem,
  useCompactViewport,
} from '@/test/crud'
import type {
  ClassificationListView,
  CostCenterListView,
  FinancialPeriodListView,
  FinancialPeriodResultView,
  MovementListView,
  MovementQuery,
  MovementView,
} from '@/types'
import MovementListViewUnderTest from '@/views/financial/movements/MovementListView.vue'

vi.mock('@/api/cards')
vi.mock('@/api/movements')
vi.mock('@/api/financialPeriods')
vi.mock('@/api/costCenters')
vi.mock('@/api/classifications')
vi.mock('@/api/wallets')
vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    warning: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
  },
}))

const november: FinancialPeriodListView = {
  id: 'p-11',
  name: 'Novembro',
  startingAt: '2026-11-01',
  endingAt: '2026-11-30',
  status: 'OPEN',
  expired: false,
}
const october: FinancialPeriodListView = {
  id: 'p-10',
  name: 'Outubro',
  startingAt: '2026-10-01',
  endingAt: '2026-10-31',
  status: 'OPEN',
  expired: true,
}
const september: FinancialPeriodListView = {
  id: 'p-09',
  name: 'Setembro',
  startingAt: '2026-09-01',
  endingAt: '2026-09-30',
  status: 'CLOSED',
  expired: false,
}

const costCenters = [{ id: 'cc-1', name: 'Casa', fullName: 'Casa' }] as CostCenterListView[]
const classifications = [
  { id: 'cl-1', name: 'Moradia', type: 'EXPENSE', active: true },
  { id: 'cl-2', name: 'Salário', type: 'INCOME', active: true },
] as ClassificationListView[]

const period = { id: 'p-11', name: 'Novembro', status: 'OPEN', expired: false } as const
const house = { id: 'cc-1', name: 'Casa', fullName: 'Casa' }
const housing = { id: 'cl-1', name: 'Moradia', type: 'EXPENSE' } as const
const salary = { id: 'cl-2', name: 'Salário', type: 'INCOME' } as const

const movements: MovementListView[] = [
  {
    id: 'm-1',
    name: 'Conta de água',
    type: 'EXPENSE',
    value: 96.12,
    dueDate: '2026-11-20',
    status: 'OPEN',
    overdue: true,
    classification: housing,
    costCenter: house,
    financialPeriod: period,
  },
  {
    id: 'm-2',
    name: 'Salário de novembro',
    type: 'INCOME',
    value: 8400,
    dueDate: '2026-11-05',
    status: 'PAID',
    overdue: false,
    classification: salary,
    costCenter: house,
    financialPeriod: period,
  },
]

const paidMovement: MovementView = {
  id: 'm-2',
  name: 'Salário de novembro',
  type: 'INCOME',
  value: 8400,
  dueDate: '2026-11-05',
  status: 'PAID',
  overdue: false,
  classification: salary,
  costCenter: house,
  financialPeriod: period,
  description: null,
  payment: {
    paidOn: '2026-11-05',
    value: 8400,
    discount: 0,
    valuePaid: 8400,
    wallet: { id: 'w-1', name: 'Conta' },
    card: null,
  },
}

const COUNTS: Record<string, number> = { ALL: 2, OPEN: 1, PAID: 1 }

const periodResult: FinancialPeriodResultView = {
  revenues: 8400,
  expenses: 96.12,
  result: 8303.88,
  toPay: 1250.5,
  overdueExpenses: 2,
}

function serve(periods = [november, october], content = movements) {
  vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf(periods))
  vi.mocked(walletsApi.findAll).mockResolvedValue(pageOf([{ id: 'w-1', name: 'Conta' }] as never[]))
  vi.mocked(cardsApi.findAll).mockResolvedValue(pageOf([{ id: 'c-1', name: 'Visa' }] as never[]))
  vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf(costCenters))
  vi.mocked(classificationsApi.findAll).mockResolvedValue(pageOf(classifications))
  vi.mocked(financialPeriodsApi.findResult).mockResolvedValue(periodResult)
  vi.mocked(movementsApi.findAll).mockImplementation((query: MovementQuery) =>
    Promise.resolve(
      query.size === 1
        ? pageOf([], COUNTS[query.statuses?.[0] ?? 'ALL'])
        : pageOf(content, content.length),
    ),
  )
}

function listing() {
  return vi.mocked(movementsApi.findAll).mock.calls.filter(([query]) => query.size !== 1)
}

function lastListing() {
  return listing().slice(-1)[0]![0]
}

function countingCalls() {
  return vi.mocked(movementsApi.findAll).mock.calls.filter(([query]) => query.size === 1)
}

async function render(location?: string, periods = [november, october], content = movements) {
  serve(periods, content)
  return mountView(MovementListViewUnderTest, 'movements', {}, {}, location)
}

function select(wrapper: Awaited<ReturnType<typeof render>>['wrapper'], index: number) {
  return wrapper.findAllComponents(FilterSelect)[index]!
}

function clearButton(wrapper: Awaited<ReturnType<typeof render>>['wrapper']) {
  return wrapper.findAll('button').find((button) => button.text().startsWith('Limpar'))!
}

async function menuItems(wrapper: Awaited<ReturnType<typeof render>>['wrapper'], row: number) {
  await wrapper
    .findAll('button[aria-label="Mais ações"]')
    [row]!.trigger('keydown', { key: 'Enter' })
  await flushPromises()
  return [...document.body.querySelectorAll('[role="menuitem"]')].map((item) =>
    item.textContent?.trim(),
  )
}

describe('MovementListView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.replaceChildren()
    useCompactViewport(false)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21))
  })

  afterEach(() => {
    vi.useRealTimers()
    useCompactViewport(false)
  })

  describe('listing', () => {
    it('opens on the period that contains today, ordered by the due date, and writes it to the URL', async () => {
      const { wrapper, router } = await render()

      expect(wrapper.find('h1').text()).toBe('Movimentos')
      expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
        'Receitas e despesas de Novembro.',
      )
      expect(listing()[0]![0]).toMatchObject({
        financialPeriods: ['p-11'],
        statuses: undefined,
        sort: 'dueDate,asc',
      })
      expect(router.currentRoute.value.query).toEqual({ period: 'p-11' })
      expect(financialPeriodsApi.findAll).toHaveBeenCalledTimes(1)
    })

    it('shows the columns of the mock with the cost center and the classification', async () => {
      const { wrapper } = await render()

      expect(wrapper.findAll('thead th').map((header) => header.text())).toEqual([
        'Nome',
        'Vencimento',
        'Centro de custo',
        'Classificação',
        'Valor (R$)',
        'Situação',
        'Ações',
      ])
      const rows = wrapper.findAll('tbody tr')
      expect(rows).toHaveLength(2)
      expect(rows[0]!.text()).toContain('Conta de água')
      expect(rows[0]!.text()).toContain('20/11/2026')
      expect(rows[0]!.text()).toContain('Casa')
      expect(rows[0]!.text()).toContain('Moradia')
      expect(rows[0]!.text()).toContain('96,12')
      expect(rows[0]!.text()).toContain('Vencido há 1 dia')
      expect(rows[1]!.text()).toContain('Salário')
      expect(rows[1]!.text()).toContain('8.400,00')
      expect(rows[0]!.text()).not.toMatch(/[+−]/)
      expect(rows[1]!.text()).not.toMatch(/[+−]/)
      expect(rows[0]!.find('[data-slot="currency"]').attributes('data-direction')).toBe('expense')
      expect(rows[1]!.find('[data-slot="currency"]').attributes('data-direction')).toBe('income')
      expect(rows[1]!.text()).toContain('Pago')
      expect(rows[0]!.attributes('data-state')).toBe('selected')
      expect(rows[1]!.attributes('data-state')).toBeUndefined()
      expect(rows[0]!.find('a').attributes('href')).toBe('/movements/m-1/detail')
    })

    it('marks the sort of the due date as the default one', async () => {
      const { wrapper } = await render()

      expect(wrapper.find('thead th[aria-sort="ascending"]').text()).toContain('Vencimento')
    })

    it('says that a card payment was made on the card', async () => {
      const onCard = { ...movements[1]!, paymentMethod: 'CARD' as const }
      const { wrapper } = await render(undefined, [november, october], [onCard])

      expect(wrapper.find('tbody tr').text()).toContain('Pago no cartão')
    })

    it('marks an invoice payment with the invoice badge and leaves its cost center and classification empty', async () => {
      const invoicePayment: MovementListView = {
        ...movements[0]!,
        name: 'Pagamento de fatura, Visa',
        classification: null,
        costCenter: null,
        invoicePayment: true,
      }
      const { wrapper } = await render(
        undefined,
        [november, october],
        [invoicePayment, movements[1]!],
      )

      const rows = wrapper.findAll('tbody tr')
      expect(rows[0]!.find('td').text()).toBe('Pagamento de fatura, Visa fatura')
      expect(rows[0]!.findAll('td')[2]!.text()).toBe('')
      expect(rows[0]!.findAll('td')[3]!.text()).toBe('')
      expect(rows[1]!.find('td').find('[data-slot="badge"]').exists()).toBe(false)
    })

    it('uses the compact layout on the phone', async () => {
      useCompactViewport(true)
      const { wrapper } = await render()

      expect(wrapper.find('table').exists()).toBe(false)
      expect(wrapper.text()).toContain('Conta de água')
      expect(wrapper.text()).toContain('Moradia')
      expect(wrapper.text()).toContain('Vencimento: 20/11/2026')
    })

    it('names the movements in the pagination, in the singular and in the plural', async () => {
      const { wrapper } = await render()
      expect(wrapper.text()).toContain('movimentos')

      const { wrapper: single } = await render(undefined, [november, october], [movements[0]!])
      expect(single.text()).toContain('1–1 de 1 movimento')
    })

    it('describes all periods when none is chosen', async () => {
      const { wrapper } = await render('/movements?period=all')

      expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
        'Receitas e despesas de todos os períodos.',
      )
      expect(wrapper.find('[data-slot="summary"]').exists()).toBe(false)
      expect(financialPeriodsApi.findResult).not.toHaveBeenCalled()
    })

    it('warns that an expired period still accepts postings', async () => {
      const { wrapper } = await render(undefined, [october])

      expect(wrapper.find('[data-slot="expired-notice"]').text()).toContain(
        'Outubro expirou em 31/10/2026 e continua aberto',
      )
    })

    it('does not warn about a period that has not expired', async () => {
      const { wrapper } = await render()

      expect(wrapper.find('[data-slot="expired-notice"]').exists()).toBe(false)
    })

    it('keeps the list without a default period when there are no periods', async () => {
      const { wrapper, router } = await render(undefined, [])

      expect(router.currentRoute.value.query).toEqual({})
      expect(listing()[0]![0].financialPeriods).toBeUndefined()
      expect(wrapper.find('[data-slot="page-description"]').text()).toBe(
        'Receitas e despesas de todos os períodos.',
      )
      expect(financialPeriodsApi.findResult).not.toHaveBeenCalled()
    })
  })

  describe('summary', () => {
    it('shows the received, paid, result and to pay of the period', async () => {
      const { wrapper } = await render()

      expect(financialPeriodsApi.findResult).toHaveBeenCalledWith('p-11')
      const summary = wrapper.find('[data-slot="summary"]')
      expect(summary.element.children).toHaveLength(4)
      expect(summary.text()).toContain('Recebido')
      expect(summary.text()).toContain('Receitas pagas')
      expect(summary.text()).toContain('Despesas pagas')
      expect(summary.text()).toContain('Receitas − despesas')
      const values = summary.findAll('[data-slot="currency"]')
      expect(values.map((value) => value.text())).toEqual([
        expect.stringMatching(/^R\$\s8\.400,00$/),
        expect.stringMatching(/^R\$\s96,12$/),
        expect.stringMatching(/^R\$\s8\.303,88$/),
        expect.stringMatching(/^R\$\s1\.250,50$/),
      ])
      expect(values.map((value) => value.attributes('data-direction'))).toEqual([
        'income',
        'expense',
        undefined,
        'expense',
      ])
    })

    it('signs and colors the result only when it is negative', async () => {
      serve()
      vi.mocked(financialPeriodsApi.findResult).mockResolvedValue({
        ...periodResult,
        result: -50,
      })
      const { wrapper } = await mountView(MovementListViewUnderTest, 'movements')

      const result = wrapper.findAll('[data-slot="summary"] [data-slot="currency"]')[2]!
      expect(result.text()).toMatch(/^−R\$\s50,00$/)
      expect(result.attributes('data-direction')).toBe('expense')
    })

    it('shows what is left to pay and how many expenses are overdue', async () => {
      const { wrapper } = await render()

      const toPay = wrapper.find('[data-slot="to-pay"]')
      expect(toPay.text()).toContain('A pagar')
      expect(toPay.text()).toMatch(/A pagarR\$\s1\.250,50/)
      expect(toPay.text()).not.toContain('−')
      expect(toPay.text()).toContain('2 vencidos')
    })

    it('uses the singular for a single overdue expense', async () => {
      serve()
      vi.mocked(financialPeriodsApi.findResult).mockResolvedValue({
        ...periodResult,
        overdueExpenses: 1,
      })
      const { wrapper } = await mountView(MovementListViewUnderTest, 'movements')

      expect(wrapper.find('[data-slot="to-pay"]').text()).toContain('1 vencido')
      expect(wrapper.find('[data-slot="to-pay"]').text()).not.toContain('vencidos')
    })

    it('says nothing is overdue when there are no overdue expenses', async () => {
      serve()
      vi.mocked(financialPeriodsApi.findResult).mockResolvedValue({
        ...periodResult,
        overdueExpenses: 0,
      })
      const { wrapper } = await mountView(MovementListViewUnderTest, 'movements')

      expect(wrapper.find('[data-slot="to-pay"]').text()).toContain('Nada vencido')
    })

    it('loads the result again when the period changes and drops it for all periods', async () => {
      const { wrapper } = await render()

      select(wrapper, 0).vm.$emit('update:modelValue', 'p-10')
      await flushPromises()
      expect(financialPeriodsApi.findResult).toHaveBeenLastCalledWith('p-10')
      expect(wrapper.find('[data-slot="summary"]').exists()).toBe(true)

      select(wrapper, 0).vm.$emit('update:modelValue', '')
      await flushPromises()
      expect(wrapper.find('[data-slot="summary"]').exists()).toBe(false)
    })

    it('shows the server error when the result cannot be loaded', async () => {
      serve()
      vi.mocked(financialPeriodsApi.findResult).mockRejectedValue(problem(500))

      const { wrapper } = await mountView(MovementListViewUnderTest, 'movements')

      expect(wrapper.find('[data-slot="summary"]').exists()).toBe(false)
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    })
  })

  describe('tabs and search', () => {
    it('offers the counts of the tabs and filters by the situation', async () => {
      const { wrapper } = await render()

      expect(wrapper.findAll('[aria-pressed]').map((button) => button.text())).toEqual([
        'Todos 2',
        'Em aberto 1',
        'Pagos 1',
      ])

      await buttonWithText(wrapper, 'Pagos').trigger('click')
      await flushPromises()

      expect(lastListing()).toMatchObject({ statuses: ['PAID'], page: 0 })
    })

    it('lists the fields the search looks at in the placeholder', async () => {
      const { wrapper } = await render()

      expect(wrapper.find('input').attributes('placeholder')).toBe(
        'Nome, centro de custo ou classificação',
      )
    })

    it('makes the counts of the tabs follow the search and the filters', async () => {
      const { wrapper } = await render()
      const before = countingCalls().length

      await wrapper.find('input').setValue('agua')
      await wrapper.find('input').trigger('keydown', { key: 'Enter' })
      await flushPromises()
      expect(countingCalls().length).toBe(before + 3)
      expect(
        countingCalls()
          .slice(-3)
          .map(([query]) => query.filter),
      ).toEqual(['agua', 'agua', 'agua'])

      select(wrapper, 1).vm.$emit('update:modelValue', 'EXPENSE')
      await flushPromises()
      expect(
        countingCalls()
          .slice(-3)
          .map(([query]) => query.type),
      ).toEqual(['EXPENSE', 'EXPENSE', 'EXPENSE'])
    })

    it('summarises the search with the number of movements found', async () => {
      const { wrapper } = await render()

      await wrapper.find('input').setValue('agua')
      await wrapper.find('input').trigger('keydown', { key: 'Enter' })
      await flushPromises()

      expect(wrapper.text()).toContain('2 movimentos encontrados para “agua”')
    })

    it('clears the search with the clear button of the field', async () => {
      const { wrapper } = await render()

      await wrapper.find('input').setValue('agua')
      await wrapper.find('button[aria-label="Limpar filtro"]').trigger('click')
      await flushPromises()

      expect(lastListing().filter).toBeUndefined()
    })
  })

  describe('URL state', () => {
    it('opens with the state of the URL, which stays there', async () => {
      const location =
        '/movements?period=all&type=EXPENSE&costCenter=cc-1&classification=cl-1&overdue=true&status=OPEN&sort=value,asc&filter=agua'

      const { router } = await render(location)

      expect(listing()[0]![0]).toEqual({
        filter: 'agua',
        statuses: ['OPEN'],
        type: 'EXPENSE',
        costCenter: 'cc-1',
        classification: 'cl-1',
        overdue: true,
        financialPeriods: undefined,
        page: 0,
        size: 15,
        sort: 'value,asc',
      })
      expect(router.currentRoute.value.fullPath).toBe(location)
      expect(financialPeriodsApi.findResult).not.toHaveBeenCalled()
    })

    it('ignores an unknown type and a flag that is not true', async () => {
      await render('/movements?period=p-11&type=BOGUS&overdue=maybe')

      expect(listing()[0]![0]).toMatchObject({ type: undefined, overdue: undefined })
    })

    it('does not write the default sort to the URL', async () => {
      const { router } = await render()

      expect(router.currentRoute.value.query.sort).toBeUndefined()
    })

    it('writes the filters to the URL as they change', async () => {
      const { wrapper, router } = await render()

      select(wrapper, 1).vm.$emit('update:modelValue', 'EXPENSE')
      await flushPromises()
      select(wrapper, 2).vm.$emit('update:modelValue', 'cc-1')
      await flushPromises()

      expect(router.currentRoute.value.query).toMatchObject({
        period: 'p-11',
        type: 'EXPENSE',
        costCenter: 'cc-1',
      })
    })
  })

  describe('filters', () => {
    it('offers the periods, marking the expired and the closed ones', async () => {
      const { wrapper } = await render(undefined, [november, october, september])

      const periodSelect = select(wrapper, 0)
      expect(periodSelect.props('options')).toEqual([
        { value: 'p-11', label: 'Novembro' },
        { value: 'p-10', label: 'Outubro · expirado' },
        { value: 'p-09', label: 'Setembro · encerrado' },
      ])
      expect(periodSelect.props('modelValue')).toBe('p-11')
    })

    it('filters by the period, the type, the cost center, the classification and the overdue ones', async () => {
      const { wrapper } = await render()

      select(wrapper, 0).vm.$emit('update:modelValue', 'p-10')
      await flushPromises()
      expect(lastListing()).toMatchObject({ financialPeriods: ['p-10'] })

      select(wrapper, 1).vm.$emit('update:modelValue', 'EXPENSE')
      await flushPromises()
      expect(lastListing()).toMatchObject({ type: 'EXPENSE', page: 0 })

      select(wrapper, 2).vm.$emit('update:modelValue', 'cc-1')
      await flushPromises()
      expect(lastListing()).toMatchObject({ costCenter: 'cc-1' })

      select(wrapper, 3).vm.$emit('update:modelValue', 'cl-1')
      await flushPromises()
      expect(lastListing()).toMatchObject({ classification: 'cl-1' })
      expect(wrapper.text()).toContain('Classificação de despesa')

      wrapper.getComponent(Switch).vm.$emit('update:modelValue', true)
      await flushPromises()
      expect(lastListing()).toMatchObject({ overdue: true })
      expect(wrapper.getComponent(Switch).props('modelValue')).toBe(true)

      wrapper.getComponent(Switch).vm.$emit('update:modelValue', false)
      await flushPromises()
      expect(lastListing().overdue).toBeUndefined()
    })

    it('labels the classification by the type and offers only the classifications of it', async () => {
      const { wrapper } = await render()
      expect(wrapper.text()).toContain('Classificação')
      expect(select(wrapper, 3).props('options')).toEqual([
        { value: 'cl-1', label: 'Moradia' },
        { value: 'cl-2', label: 'Salário' },
      ])

      select(wrapper, 1).vm.$emit('update:modelValue', 'INCOME')
      await flushPromises()
      expect(wrapper.text()).toContain('Classificação de receita')
      expect(select(wrapper, 3).props('options')).toEqual([{ value: 'cl-2', label: 'Salário' }])

      select(wrapper, 1).vm.$emit('update:modelValue', 'EXPENSE')
      await flushPromises()
      expect(select(wrapper, 3).props('options')).toEqual([{ value: 'cl-1', label: 'Moradia' }])
    })

    it('offers the cost centers by their full name', async () => {
      const { wrapper } = await render()

      expect(select(wrapper, 2).props('options')).toEqual([{ value: 'cc-1', label: 'Casa' }])
    })

    it('drops a classification that does not belong to the chosen type', async () => {
      const { wrapper } = await render('/movements?period=p-11&type=EXPENSE&classification=cl-1')

      select(wrapper, 1).vm.$emit('update:modelValue', 'INCOME')
      await flushPromises()
      expect(lastListing()).toMatchObject({ type: 'INCOME', classification: undefined })

      select(wrapper, 1).vm.$emit('update:modelValue', '')
      await flushPromises()
      expect(lastListing().type).toBeUndefined()
    })

    it('keeps a classification of the chosen type', async () => {
      const { wrapper } = await render('/movements?period=p-11&type=INCOME&classification=cl-2')

      select(wrapper, 1).vm.$emit('update:modelValue', 'INCOME')
      await flushPromises()

      expect(lastListing()).toMatchObject({ classification: 'cl-2' })
    })

    it('counts the narrowed filters in the clear button and clears them to the default period', async () => {
      const { wrapper } = await render()

      expect(clearButton(wrapper).text()).toBe('Limpar')
      expect(clearButton(wrapper).attributes('disabled')).toBeDefined()

      select(wrapper, 0).vm.$emit('update:modelValue', '')
      await flushPromises()
      expect(lastListing().financialPeriods).toBeUndefined()
      expect(clearButton(wrapper).text()).toBe('Limpar (1)')
      expect(clearButton(wrapper).attributes('disabled')).toBeUndefined()

      select(wrapper, 1).vm.$emit('update:modelValue', 'INCOME')
      await flushPromises()
      expect(clearButton(wrapper).text()).toBe('Limpar (2)')

      await clearButton(wrapper).trigger('click')
      await flushPromises()
      expect(lastListing()).toMatchObject({ financialPeriods: ['p-11'], type: undefined })
      expect(clearButton(wrapper).attributes('disabled')).toBeDefined()
    })

    it('clears the filters to all periods when there is no default one', async () => {
      const { wrapper } = await render('/movements?period=all&type=INCOME', [])

      await clearButton(wrapper).trigger('click')
      await flushPromises()

      expect(lastListing().type).toBeUndefined()
      expect(lastListing().financialPeriods).toBeUndefined()
    })
  })

  describe('sorting', () => {
    it('sorts by the value, the cost center and the due date', async () => {
      const { wrapper } = await render()

      await buttonWithText(wrapper, 'Valor (R$)').trigger('click')
      await flushPromises()
      expect(lastListing()).toMatchObject({ sort: 'value,asc' })

      await buttonWithText(wrapper, 'Centro de custo').trigger('click')
      await flushPromises()
      expect(lastListing()).toMatchObject({ sort: 'costCenter,asc' })

      await buttonWithText(wrapper, 'Vencimento').trigger('click')
      await flushPromises()
      expect(lastListing()).toMatchObject({ sort: 'dueDate,asc' })
    })

    it('reverses the default sort of the due date on the next click', async () => {
      const { wrapper } = await render()

      await buttonWithText(wrapper, 'Vencimento').trigger('click')
      await flushPromises()

      expect(lastListing()).toMatchObject({ sort: 'dueDate,desc' })
    })

    it('does not sort by the classification', async () => {
      const { wrapper } = await render()

      expect(
        wrapper
          .findAll('thead th')
          .find((header) => header.text() === 'Classificação')!
          .findAll('button'),
      ).toHaveLength(0)
    })
  })

  describe('row actions', () => {
    it('opens the details from the row menu', async () => {
      const { wrapper, router } = await render()

      await chooseRowAction(wrapper, 0, 'Detalhes')

      expect(router.currentRoute.value.name).toBe('movements.detail')
      expect(router.currentRoute.value.params.id).toBe('m-1')
    })

    it('opens the details when a row is clicked', async () => {
      const { wrapper, router } = await render()

      await wrapper.findAll('tbody tr')[1]!.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('movements.detail')
      expect(router.currentRoute.value.params.id).toBe('m-2')
    })

    it('offers an open expense to pay, edit and delete', async () => {
      const { wrapper } = await render()

      expect(await menuItems(wrapper, 0)).toEqual(['Detalhes', 'Pagar', 'Editar', 'Excluir'])
    })

    it('offers an open income to receive', async () => {
      const income = { ...movements[0]!, type: 'INCOME' as const, overdue: false }
      const { wrapper } = await render(undefined, [november, october], [income])

      expect(await menuItems(wrapper, 0)).toContain('Receber')
    })

    it('offers a paid movement of an open period to undo the payment', async () => {
      const { wrapper } = await render()

      expect(await menuItems(wrapper, 1)).toEqual(['Detalhes', 'Desfazer pagamento'])
    })

    it('offers no undo for a paid movement of a closed period', async () => {
      const closed = {
        ...movements[1]!,
        financialPeriod: { ...period, status: 'CLOSED' as const },
      }
      const { wrapper } = await render(undefined, [november, october], [closed])

      expect(await menuItems(wrapper, 0)).toEqual(['Detalhes'])
    })

    it('goes to the form to create and to edit', async () => {
      const { wrapper, router } = await render()

      await buttonWithText(wrapper, 'Criar').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('movements.create')

      await router.push('/movements?period=p-11')
      await flushPromises()
      await chooseRowAction(wrapper, 0, 'Editar')
      expect(router.currentRoute.value.name).toBe('movements.update')
      expect(router.currentRoute.value.params.id).toBe('m-1')
    })

    it('deletes an open movement after confirmation, naming it', async () => {
      vi.mocked(movementsApi.remove).mockResolvedValue(undefined)
      const { wrapper } = await render()
      const dialog = useConfirmDialog()

      await chooseRowAction(wrapper, 0, 'Excluir')
      expect(dialog.state.options.title).toBe('Excluir “Conta de água”?')
      dialog.accept()
      await flushPromises()

      expect(movementsApi.remove).toHaveBeenCalledWith('m-1')
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      expect(toast.success).toHaveBeenCalledWith('Movimento excluído', {
        description: '“Conta de água” saiu da lista.',
        duration: 4000,
      })
    })

    it('keeps the movement when the deletion is not confirmed', async () => {
      const { wrapper } = await render()

      await chooseRowAction(wrapper, 0, 'Excluir')
      useConfirmDialog().cancel()
      await flushPromises()

      expect(movementsApi.remove).not.toHaveBeenCalled()
    })
  })

  describe('payment', () => {
    it('pays an open movement from the dialog and reloads the list and the totals', async () => {
      vi.mocked(movementsApi.pay).mockResolvedValue({} as never)
      const { wrapper } = await render()

      await chooseRowAction(wrapper, 0, 'Pagar')
      const dialog = wrapper.getComponent(PayMovementDialog)
      expect(dialog.props('movement')).toMatchObject({ id: 'm-1', type: 'EXPENSE' })

      const before = listing().length
      dialog.vm.$emit('pay', dialog.props('movement'), { wallet: 'w-1', paidOn: '2026-11-21' })
      await flushPromises()

      expect(movementsApi.pay).toHaveBeenCalledWith('m-1', {
        wallet: 'w-1',
        paidOn: '2026-11-21',
      })
      expect(toast.success).toHaveBeenCalledWith('Pagamento registrado', expect.anything())
      expect(dialog.props('movement')).toBeNull()
      expect(listing().length).toBe(before + 1)
      expect(financialPeriodsApi.findResult).toHaveBeenCalledTimes(2)
    })

    it('gives the dialog the active wallets and cards', async () => {
      const { wrapper } = await render()

      await chooseRowAction(wrapper, 0, 'Pagar')
      const dialog = wrapper.getComponent(PayMovementDialog)

      expect(dialog.props('wallets')).toEqual([{ id: 'w-1', name: 'Conta' }])
      expect(dialog.props('cards')).toEqual([{ id: 'c-1', name: 'Visa' }])
    })

    it('closes the payment dialog without paying', async () => {
      const { wrapper } = await render()

      await chooseRowAction(wrapper, 0, 'Pagar')
      wrapper.getComponent(PayMovementDialog).vm.$emit('close')
      await flushPromises()

      expect(wrapper.getComponent(PayMovementDialog).props('movement')).toBeNull()
      expect(movementsApi.pay).not.toHaveBeenCalled()
    })

    it('keeps the dialog open and shows the error when the payment fails', async () => {
      vi.mocked(movementsApi.pay).mockRejectedValue(problem(400, { error: 'invalid-discount' }))
      const { wrapper } = await render()

      await chooseRowAction(wrapper, 0, 'Pagar')
      const dialog = wrapper.getComponent(PayMovementDialog)
      dialog.vm.$emit('pay', dialog.props('movement'), { wallet: 'w-1' })
      await flushPromises()

      expect(dialog.props('movement')).not.toBeNull()
      expect(dialog.props('messages')).toHaveLength(1)
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
    })

    it('clears the payment error when the dialog is opened again', async () => {
      vi.mocked(movementsApi.pay).mockRejectedValue(problem(400, { error: 'invalid-discount' }))
      const { wrapper } = await render()
      await chooseRowAction(wrapper, 0, 'Pagar')
      const dialog = wrapper.getComponent(PayMovementDialog)
      dialog.vm.$emit('pay', dialog.props('movement'), { wallet: 'w-1' })
      await flushPromises()
      dialog.vm.$emit('close')
      await flushPromises()

      await chooseRowAction(wrapper, 0, 'Pagar')

      expect(wrapper.getComponent(PayMovementDialog).props('messages')).toEqual([])
    })

    it('shows the server error when the wallets cannot be loaded', async () => {
      serve()
      vi.mocked(walletsApi.findAll).mockRejectedValue(problem(500))

      const { wrapper } = await mountView(MovementListViewUnderTest, 'movements')

      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    })
  })

  describe('undoing a payment', () => {
    it('opens the undo dialog with the movement and undoes the payment when confirmed', async () => {
      vi.mocked(movementsApi.findById).mockResolvedValue(paidMovement)
      vi.mocked(movementsApi.undoPayment).mockResolvedValue({} as never)
      const { wrapper } = await render()

      await chooseRowAction(wrapper, 1, 'Desfazer pagamento')
      const dialog = wrapper.getComponent(UndoPaymentDialog)
      expect(movementsApi.findById).toHaveBeenCalledWith('m-2')
      expect(dialog.props('movement')).toMatchObject({ id: 'm-2' })
      expect(document.body.textContent).toContain('Desfazer o pagamento de “Salário de novembro”?')

      const before = listing().length
      dialog.vm.$emit('confirm', paidMovement)
      await flushPromises()

      expect(movementsApi.undoPayment).toHaveBeenCalledWith('m-2')
      expect(toast.success).toHaveBeenCalledWith('Pagamento desfeito', expect.anything())
      expect(dialog.props('movement')).toBeNull()
      expect(listing().length).toBe(before + 1)
      expect(financialPeriodsApi.findResult).toHaveBeenCalledTimes(2)
    })

    it('keeps the payment when the undo dialog is closed', async () => {
      vi.mocked(movementsApi.findById).mockResolvedValue(paidMovement)
      const { wrapper } = await render()

      await chooseRowAction(wrapper, 1, 'Desfazer pagamento')
      wrapper.getComponent(UndoPaymentDialog).vm.$emit('close')
      await flushPromises()

      expect(wrapper.getComponent(UndoPaymentDialog).props('movement')).toBeNull()
      expect(movementsApi.undoPayment).not.toHaveBeenCalled()
    })

    it('keeps the dialog open and shows the error when the undo fails', async () => {
      vi.mocked(movementsApi.findById).mockResolvedValue(paidMovement)
      vi.mocked(movementsApi.undoPayment).mockRejectedValue(problem(500))
      const { wrapper } = await render()

      await chooseRowAction(wrapper, 1, 'Desfazer pagamento')
      const dialog = wrapper.getComponent(UndoPaymentDialog)
      dialog.vm.$emit('confirm', paidMovement)
      await flushPromises()

      expect(dialog.props('movement')).not.toBeNull()
      expect(dialog.props('messages')).toHaveLength(1)
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(false)
    })

    it('shows the server error when the movement of the undo cannot be loaded', async () => {
      vi.mocked(movementsApi.findById).mockRejectedValue(problem(500))
      const { wrapper } = await render()

      await chooseRowAction(wrapper, 1, 'Desfazer pagamento')

      expect(wrapper.getComponent(UndoPaymentDialog).props('movement')).toBeNull()
      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    })
  })

  describe('list states', () => {
    it('shows the empty state of the period and offers to create the first movement', async () => {
      serve([november], [])
      vi.mocked(movementsApi.findAll).mockImplementation(() => Promise.resolve(pageOf([], 0)))

      const { wrapper, router } = await mountView(MovementListViewUnderTest, 'movements')

      const empty = wrapper.find('[data-state="empty"]')
      expect(empty.text()).toContain('Nenhum movimento em Novembro')
      expect(empty.text()).toContain('Lance a primeira receita ou despesa do período.')
      await empty.find('button').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('movements.create')
    })

    it('shows the empty state of all periods', async () => {
      serve([november], [])
      vi.mocked(movementsApi.findAll).mockImplementation(() => Promise.resolve(pageOf([], 0)))

      const { wrapper } = await mountView(
        MovementListViewUnderTest,
        'movements',
        {},
        {},
        '/movements?period=all',
      )

      expect(wrapper.find('[data-state="empty"]').text()).toContain('Nenhum movimento ainda')
    })

    it('says nothing matched the search and clears the search, the tab and the filters', async () => {
      const { wrapper } = await render('/movements?period=p-10&type=EXPENSE&status=OPEN')
      vi.mocked(movementsApi.findAll).mockImplementation((query: MovementQuery) =>
        Promise.resolve(pageOf([], query.size === 1 ? 2 : 0)),
      )

      await wrapper.find('input').setValue('zzz')
      await wrapper.find('input').trigger('keydown', { key: 'Enter' })
      await flushPromises()
      const noResult = wrapper.find('[data-state="no-result"]')
      expect(noResult.text()).toContain('Nenhum movimento encontrado para “zzz”')
      expect(noResult.text()).toContain('Mude os filtros ou limpe a busca.')

      await noResult.find('button').trigger('click')
      await flushPromises()
      expect(lastListing()).toMatchObject({
        filter: undefined,
        statuses: undefined,
        type: undefined,
        financialPeriods: ['p-11'],
      })
    })

    it('says nothing matched the filters when there is no search text', async () => {
      const { wrapper } = await render()
      vi.mocked(movementsApi.findAll).mockImplementation((query: MovementQuery) =>
        Promise.resolve(pageOf([], query.size === 1 ? 2 : 0)),
      )

      select(wrapper, 1).vm.$emit('update:modelValue', 'INCOME')
      await flushPromises()

      const noResult = wrapper.find('[data-state="no-result"]')
      expect(noResult.text()).toContain('Nenhum movimento com esses filtros')
      expect(noResult.text()).toContain('Limpar filtros')
    })

    it('shows the error state when the movements cannot be loaded and retries', async () => {
      serve()
      vi.mocked(movementsApi.findAll).mockRejectedValue(problem(500))

      const { wrapper } = await mountView(MovementListViewUnderTest, 'movements')
      const error = wrapper.find('[data-state="error"]')
      expect(error.exists()).toBe(true)
      expect(error.text()).toContain('O servidor não respondeu. Seus filtros continuam na URL.')

      serve()
      await wrapper.find('[data-state="error"] button').trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-state="error"]').exists()).toBe(false)
      expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    })

    it('shows the server error when the options cannot be loaded', async () => {
      serve()
      vi.mocked(financialPeriodsApi.findAll).mockRejectedValue(problem(500))

      const { wrapper } = await mountView(MovementListViewUnderTest, 'movements')

      expect(wrapper.find('[data-slot="server-error"]').exists()).toBe(true)
    })
  })
})
