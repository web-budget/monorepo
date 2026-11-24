import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoicesApi } from '@/api/invoices'
import { useOpenInvoice } from '@/composables/useOpenInvoice'
import { pageOf, problem } from '@/test/crud'

vi.mock('@/api/invoices')

describe('useOpenInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts without anything missing', () => {
    const openInvoice = useOpenInvoice()

    expect(openInvoice.missing.value).toBe(false)
    expect(openInvoice.existing.value).toBeNull()
  })

  it('looks for one open invoice of the card in the period', async () => {
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([{ id: 'i-1' }] as never[]))
    const openInvoice = useOpenInvoice()

    await openInvoice.check('k-1', 'p-11')

    expect(invoicesApi.findAll).toHaveBeenCalledTimes(1)
    expect(invoicesApi.findAll).toHaveBeenCalledWith({
      card: 'k-1',
      financialPeriod: 'p-11',
      statuses: ['OPEN'],
      size: 1,
    })
    expect(openInvoice.missing.value).toBe(false)
    expect(openInvoice.existing.value).toBeNull()
  })

  it('reports the invoice as missing, with the closed one it found, when there is no open one', async () => {
    vi.mocked(invoicesApi.findAll)
      .mockResolvedValueOnce(pageOf([]))
      .mockResolvedValueOnce(pageOf([{ id: 'i-9' }] as never[]))
    const openInvoice = useOpenInvoice()

    await openInvoice.check('k-1', 'p-11')

    expect(invoicesApi.findAll).toHaveBeenLastCalledWith({
      card: 'k-1',
      financialPeriod: 'p-11',
      size: 1,
    })
    expect(openInvoice.missing.value).toBe(true)
    expect(openInvoice.existing.value).toEqual({ id: 'i-9' })
  })

  it('has no invoice at all to point to when the card has none in the period', async () => {
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([]))
    const openInvoice = useOpenInvoice()

    await openInvoice.check('k-1', 'p-11')

    expect(openInvoice.missing.value).toBe(true)
    expect(openInvoice.existing.value).toBeNull()
  })

  it('clears the report when the card or the period is not chosen', async () => {
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([]))
    const openInvoice = useOpenInvoice()
    await openInvoice.check('k-1', 'p-11')
    vi.mocked(invoicesApi.findAll).mockClear()

    await openInvoice.check(null, 'p-11')
    expect(openInvoice.missing.value).toBe(false)

    await openInvoice.check('k-1', 'p-11')
    await openInvoice.check('k-1', undefined)
    expect(openInvoice.missing.value).toBe(false)
    expect(invoicesApi.findAll).toHaveBeenCalledTimes(2)
  })

  it('does not report a missing invoice when the lookup fails', async () => {
    vi.mocked(invoicesApi.findAll).mockRejectedValue(problem(500))
    const openInvoice = useOpenInvoice()

    await openInvoice.check('k-1', 'p-11')

    expect(openInvoice.missing.value).toBe(false)
  })
})
