import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cardPurchasesApi } from '@/api/cardPurchases'
import { invoicesApi } from '@/api/invoices'
import { toInvoiceQuery, useInvoicesStore } from '@/stores/invoices'
import type { InvoiceView } from '@/types'
import { createPageRequest, toPageQuery } from '@/utils/pageRequest'

vi.mock('@/api/invoices')
vi.mock('@/api/cardPurchases')

const invoice = { id: 'i-1', status: 'OPEN', value: 10 } as InvoiceView
const page = { content: [invoice], page: { size: 15, number: 0, totalElements: 1, totalPages: 1 } }

describe('toInvoiceQuery', () => {
  const query = toPageQuery(createPageRequest({ status: 'ALL' }))

  it('leaves out what is not filled', () => {
    expect(toInvoiceQuery(query, {})).toEqual({
      card: undefined,
      financialPeriod: undefined,
      statuses: undefined,
      page: 0,
      size: 15,
      sort: 'createdOn,desc',
    })
  })

  it('translates the status and the filters, and reads "all periods" as no period', () => {
    expect(
      toInvoiceQuery({ ...query, status: 'PAID' }, { card: 'c-1', period: 'p-1' }),
    ).toMatchObject({
      card: 'c-1',
      financialPeriod: 'p-1',
      statuses: ['PAID'],
    })
    expect(toInvoiceQuery(query, { period: 'all' }).financialPeriod).toBeUndefined()
    expect(toInvoiceQuery({ ...query, status: undefined as never }, {}).statuses).toBeUndefined()
  })
})

describe('useInvoicesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the page with the filters of the store', async () => {
    vi.mocked(invoicesApi.findAll).mockResolvedValue(page)
    const store = useInvoicesStore()
    store.filters = { card: 'c-1' }

    await store.findAll()

    expect(invoicesApi.findAll).toHaveBeenCalledWith(expect.objectContaining({ card: 'c-1' }))
    expect(store.pageResponse.content).toEqual([invoice])
    expect(store.loading).toBe(false)
  })

  it('counts the invoices of a status with a page of one, and gives up quietly on failure', async () => {
    vi.mocked(invoicesApi.findAll).mockResolvedValueOnce({
      ...page,
      page: { ...page.page, totalElements: 7 },
    })
    const store = useInvoicesStore()

    await expect(store.count('OPEN')).resolves.toBe(7)
    expect(invoicesApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['OPEN'], size: 1, page: 0 }),
    )

    vi.mocked(invoicesApi.findAll).mockRejectedValueOnce(new Error('boom'))
    await expect(store.count('OPEN')).resolves.toBeNull()
  })

  it('loads one invoice, its purchases and closes it', async () => {
    vi.mocked(invoicesApi.findById).mockResolvedValue(invoice)
    vi.mocked(invoicesApi.close).mockResolvedValue({ ...invoice, status: 'CLOSED' })
    vi.mocked(cardPurchasesApi.findAll).mockResolvedValue({
      content: [],
      page: { size: 50, number: 0, totalElements: 4, totalPages: 1 },
    })
    const store = useInvoicesStore()

    await store.findOne('i-1')
    expect(store.invoice).toEqual(invoice)

    await store.findPurchases('i-1')
    expect(cardPurchasesApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ invoice: 'i-1' }),
    )
    expect(store.purchases.totalElements).toBe(4)

    await store.close('i-1')
    expect(store.invoice?.status).toBe('CLOSED')
  })

  it('stops loading when a call fails and forgets everything on reset', async () => {
    vi.mocked(invoicesApi.close).mockRejectedValue(new Error('boom'))
    const store = useInvoicesStore()
    await expect(store.close('i-1')).rejects.toThrow('boom')
    expect(store.loading).toBe(false)

    store.filters = { card: 'c-1' }
    store.reset()

    expect(store.filters).toEqual({})
    expect(store.invoice).toBeNull()
    expect(store.pageResponse.content).toEqual([])
  })
})
