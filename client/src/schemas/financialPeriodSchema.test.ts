import { beforeAll, describe, expect, it } from 'vitest'
import { financialPeriodSchema } from '@/schemas/financialPeriodSchema'
import { installZodErrorMap } from '@/schemas/zodErrorMap'

const valid = {
  name: 'January',
  startingAt: '2026-01-01',
  endingAt: '2026-01-31',
  revenuesGoal: '',
  expensesGoal: '10',
}

describe('financialPeriodSchema', () => {
  beforeAll(() => {
    installZodErrorMap()
  })

  it('accepts a period and reads the goals as optional numbers', () => {
    expect(financialPeriodSchema.parse(valid)).toEqual({
      ...valid,
      revenuesGoal: null,
      expensesGoal: 10,
    })
  })

  it('accepts a one day period', () => {
    expect(financialPeriodSchema.safeParse({ ...valid, endingAt: '2026-01-01' }).success).toBe(true)
  })

  it('rejects an end before the start with a translated message on the end field', () => {
    const result = financialPeriodSchema.safeParse({ ...valid, endingAt: '2025-12-31' })

    expect(result.success).toBe(false)
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ['endingAt'],
        message: 'A data de fim não pode ser anterior à data de início',
      }),
    ])
  })

  it('only asks for the end date when it is empty', () => {
    const result = financialPeriodSchema.safeParse({ ...valid, endingAt: '' })

    expect(result.error?.issues.map((issue) => issue.message)).toEqual(['Campo obrigatório'])
  })
})
