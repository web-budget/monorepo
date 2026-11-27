import { describe, expect, it } from 'vitest'
import {
  buildHistoryQuery,
  historySignature,
  parseHistoryQuery,
} from '@/utils/reconciliationHistory'

describe('parseHistoryQuery', () => {
  it('reads the reconciliation, the page (from one) and the size', () => {
    expect(
      parseHistoryQuery({
        reconciliation: 'r-1',
        reconciliationsPage: '3',
        reconciliationsSize: '30',
      }),
    ).toEqual({ reconciliation: 'r-1', page: 2, size: 30 })
  })

  it('has no reconciliation, no page and the default size when the URL says nothing', () => {
    expect(parseHistoryQuery({})).toEqual({ reconciliation: '', page: null, size: 15 })
  })

  it.each(['0', '-1', 'abc', '1.5', '', '1234567890'])(
    'has no page for the value "%s"',
    (value) => {
      expect(parseHistoryQuery({ reconciliationsPage: value }).page).toBeNull()
    },
  )

  it.each(['7', 'abc', '', '0'])('falls back to the default size for the value "%s"', (value) => {
    expect(parseHistoryQuery({ reconciliationsSize: value }).size).toBe(15)
  })

  it('takes the first of a repeated parameter', () => {
    expect(parseHistoryQuery({ reconciliationsPage: ['2', '5'] }).page).toBe(1)
  })
})

describe('buildHistoryQuery', () => {
  it('leaves out what is the default', () => {
    expect(buildHistoryQuery({}, { reconciliation: '', current: 0, size: 15 })).toEqual({})
  })

  it('writes the page from one and the size when they are not the default', () => {
    expect(buildHistoryQuery({}, { reconciliation: '', current: 2, size: 30 })).toEqual({
      reconciliationsPage: '3',
      reconciliationsSize: '30',
    })
  })

  it('always writes the page when there is a reconciliation, even the first', () => {
    expect(buildHistoryQuery({}, { reconciliation: 'r-1', current: 0, size: 15 })).toEqual({
      reconciliation: 'r-1',
      reconciliationsPage: '1',
    })
  })

  it('keeps the parameters that are not the history, and replaces the ones that are', () => {
    expect(
      buildHistoryQuery(
        {
          from: 'mail',
          reconciliation: 'old',
          reconciliationsPage: '9',
          reconciliationsSize: '60',
        },
        { reconciliation: '', current: 0, size: 15 },
      ),
    ).toEqual({ from: 'mail' })
  })
})

describe('historySignature', () => {
  it('is the same for queries that say the same about the history', () => {
    expect(historySignature({ reconciliationsPage: '2', other: 'a' })).toBe(
      historySignature({ reconciliationsPage: '2', other: 'b' }),
    )
  })

  it('differs when any of the three parameters differs', () => {
    const base = historySignature({})
    expect(historySignature({ reconciliation: 'r-1' })).not.toBe(base)
    expect(historySignature({ reconciliationsPage: '2' })).not.toBe(base)
    expect(historySignature({ reconciliationsSize: '30' })).not.toBe(base)
  })
})
