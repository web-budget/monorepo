import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { importsApi } from '@/api/imports'
import { invoicesApi } from '@/api/invoices'
import { useImportDestinationCheck } from '@/composables/useImportDestinationCheck'
import { pageOf } from '@/test/crud'
import type { ImportListView, ImportTarget } from '@/types'

vi.mock('@/api/imports')
vi.mock('@/api/invoices')

function setup(target: ImportTarget, card: string, wallet: string, period: string) {
  const destination = {
    target: ref<ImportTarget>(target),
    card: ref(card),
    wallet: ref(wallet),
    financialPeriod: ref(period),
  }
  return { destination, check: useImportDestinationCheck(destination) }
}

describe('useImportDestinationCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([{ id: 'i-1' }] as never[]))
    vi.mocked(importsApi.findAll).mockResolvedValue(pageOf([]))
  })

  it('finds an open invoice and no draft for a card', async () => {
    const { check } = setup('CARD', 'c-1', '', 'p-1')
    await flushPromises()

    expect(invoicesApi.findAll).toHaveBeenCalledWith({
      card: 'c-1',
      financialPeriod: 'p-1',
      statuses: ['OPEN'],
      size: 1,
    })
    expect(importsApi.findAll).toHaveBeenCalledWith({
      statuses: ['PROCESSING', 'READY'],
      card: 'c-1',
      wallet: undefined,
      financialPeriod: 'p-1',
      size: 1,
    })
    expect(check.withoutOpenInvoice.value).toBe(false)
    expect(check.draft.value).toBeNull()
  })

  it('reports a card without an open invoice and the draft that already exists', async () => {
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([]))
    vi.mocked(importsApi.findAll).mockResolvedValue(pageOf([{ id: 'd-1' }] as ImportListView[]))

    const { check } = setup('CARD', 'c-1', '', 'p-1')
    await flushPromises()

    expect(check.withoutOpenInvoice.value).toBe(true)
    expect(check.draft.value?.id).toBe('d-1')
  })

  it('does not look at the invoice for a wallet', async () => {
    const { check, destination } = setup('WALLET', 'c-1', 'w-1', 'p-1')
    await flushPromises()

    expect(invoicesApi.findAll).not.toHaveBeenCalled()
    expect(importsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ card: undefined, wallet: 'w-1' }),
    )
    expect(check.withoutOpenInvoice.value).toBe(false)

    destination.target.value = 'CARD'
    await flushPromises()

    expect(invoicesApi.findAll).toHaveBeenCalledTimes(1)
  })

  it('clears the alerts while the destination or the period is not chosen', async () => {
    vi.mocked(invoicesApi.findAll).mockResolvedValue(pageOf([]))
    const { check, destination } = setup('CARD', 'c-1', '', 'p-1')
    await flushPromises()

    expect(check.withoutOpenInvoice.value).toBe(true)

    destination.card.value = ''
    await flushPromises()

    expect(check.withoutOpenInvoice.value).toBe(false)
    expect(check.draft.value).toBeNull()

    destination.card.value = 'c-1'
    destination.financialPeriod.value = ''
    await flushPromises()

    expect(check.withoutOpenInvoice.value).toBe(false)
  })
})
