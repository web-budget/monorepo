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
})
