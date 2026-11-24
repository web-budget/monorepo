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
    expect(useOpenInvoice().missing.value).toBe(false)
  })

  it('looks for one open invoice of the card in the period', async () => {
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([{ id: 'i-1' }] as never[]))
    const openInvoice = useOpenInvoice()

    await openInvoice.check('k-1', 'p-11')

    expect(invoicesApi.findAll).toHaveBeenCalledWith({
      card: 'k-1',
      financialPeriod: 'p-11',
      statuses: ['OPEN'],
      size: 1,
    })
    expect(openInvoice.missing.value).toBe(false)
  })

  it('reports the invoice as missing when there is none', async () => {
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([]))
    const openInvoice = useOpenInvoice()

    await openInvoice.check('k-1', 'p-11')

    expect(openInvoice.missing.value).toBe(true)
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
    expect(invoicesApi.findAll).toHaveBeenCalledTimes(1)
  })

  it('does not report a missing invoice when the lookup fails', async () => {
    vi.mocked(invoicesApi.findAll).mockRejectedValue(problem(500))
    const openInvoice = useOpenInvoice()

    await openInvoice.check('k-1', 'p-11')

    expect(openInvoice.missing.value).toBe(false)
  })
})
