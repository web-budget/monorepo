import { describe, expect, it, vi } from 'vitest'
import { classificationsApi } from '@/api/classifications'
import { costCentersApi } from '@/api/costCenters'
import { financialPeriodsApi } from '@/api/financialPeriods'
import { useMovementFilterOptions } from '@/composables/useMovementFilterOptions'
import { pageOf } from '@/test/crud'

vi.mock('@/api/classifications')
vi.mock('@/api/costCenters')
vi.mock('@/api/financialPeriods')

describe('useMovementFilterOptions', () => {
  it('loads the periods, the cost centers and the active classifications', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf([{ id: 'p-1' }] as never[]))
    vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf([{ id: 'cc-1' }] as never[]))
    vi.mocked(classificationsApi.findAll).mockResolvedValue(pageOf([{ id: 'cl-1' }] as never[]))
    const options = useMovementFilterOptions()

    await options.load()

    expect(options.periods.value).toEqual([{ id: 'p-1' }])
    expect(options.costCenters.value).toEqual([{ id: 'cc-1' }])
    expect(options.classifications.value).toEqual([{ id: 'cl-1' }])
    expect(costCentersApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'fullName,asc' }),
    )
    expect(classificationsApi.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', sort: 'name,asc' }),
    )
  })

  it('loads every page of cost centers and classifications', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf([]))
    const secondPage = (content: never[]) => ({
      content,
      page: { size: 100, number: 1, totalElements: 101, totalPages: 2 },
    })
    const firstPage = (content: never[]) => ({
      content,
      page: { size: 100, number: 0, totalElements: 101, totalPages: 2 },
    })
    vi.mocked(costCentersApi.findAll)
      .mockResolvedValueOnce(firstPage([{ id: 'cc-1' }] as never[]))
      .mockResolvedValueOnce(secondPage([{ id: 'cc-101' }] as never[]))
    vi.mocked(classificationsApi.findAll)
      .mockResolvedValueOnce(firstPage([{ id: 'cl-1' }] as never[]))
      .mockResolvedValueOnce(secondPage([{ id: 'cl-101' }] as never[]))
    const options = useMovementFilterOptions()

    await options.load()

    expect(options.costCenters.value).toEqual([{ id: 'cc-1' }, { id: 'cc-101' }])
    expect(options.classifications.value).toEqual([{ id: 'cl-1' }, { id: 'cl-101' }])
  })

  it('is loading only while the options are being fetched', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockResolvedValue(pageOf([]))
    vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf([]))
    vi.mocked(classificationsApi.findAll).mockResolvedValue(pageOf([]))
    const options = useMovementFilterOptions()

    const pending = options.load()
    expect(options.loading.value).toBe(true)
    await pending

    expect(options.loading.value).toBe(false)
  })

  it('stops loading when a request fails', async () => {
    vi.mocked(financialPeriodsApi.findAll).mockRejectedValue(new Error('down'))
    vi.mocked(costCentersApi.findAll).mockResolvedValue(pageOf([]))
    vi.mocked(classificationsApi.findAll).mockResolvedValue(pageOf([]))
    const options = useMovementFilterOptions()

    await expect(options.load()).rejects.toThrow('down')

    expect(options.loading.value).toBe(false)
  })
})
