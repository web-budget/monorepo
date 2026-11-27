import { describe, expect, it } from 'vitest'
import {
  createReconciliationSchema,
  reconciliationDifference,
  toReconciliationForm,
} from '@/schemas/reconciliationSchema'

const schema = createReconciliationSchema(() => 1000)

function issuesOf(values: Record<string, unknown>) {
  const result = schema.safeParse(values)
  return result.success
    ? []
    : result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        i18n: (issue as { params?: { i18n?: string } }).params?.i18n,
      }))
}

describe('reconciliationDifference', () => {
  it('rounds the difference to cents', () => {
    expect(reconciliationDifference(4824.77, 4812.37)).toBe(12.4)
    expect(reconciliationDifference(0.3, 0.1)).toBe(0.2)
    expect(reconciliationDifference(10, 10)).toBe(0)
  })
})

describe('reconciliationSchema', () => {
  it('accepts a difference with a reason', () => {
    expect(issuesOf({ informedBalance: 1012.4, reason: 'Centavos' })).toEqual([])
  })

  it('accepts a matching balance without a reason', () => {
    expect(issuesOf({ informedBalance: 1000 })).toEqual([])
  })

  it('accepts a negative balance', () => {
    expect(issuesOf({ informedBalance: -120, reason: 'Cheque especial' })).toEqual([])
  })

  it.each([[null], [undefined], ['']])('asks for the balance when it is %s', (informedBalance) => {
    expect(issuesOf({ informedBalance })).toEqual([
      { path: 'informedBalance', i18n: 'reconciliation-balance-required' },
    ])
  })

  it.each([[Number.NaN], ['abc'], [Infinity]])('refuses %s as a balance', (informedBalance) => {
    expect(issuesOf({ informedBalance })).toEqual([
      { path: 'informedBalance', i18n: 'reconciliation-balance-invalid' },
    ])
  })

  it.each([[undefined], [''], ['   ']])(
    'asks for the reason of a difference when it is %j',
    (reason) => {
      expect(issuesOf({ informedBalance: 1012.4, reason })).toEqual([
        { path: 'reason', i18n: 'reconciliation-reason-required' },
      ])
    },
  )

  it('refuses a reason over 150 characters', () => {
    expect(issuesOf({ informedBalance: 1012.4, reason: 'a'.repeat(151) })).toHaveLength(1)
    expect(issuesOf({ informedBalance: 1012.4, reason: 'a'.repeat(150) })).toEqual([])
  })

  it('follows the balance of the wallet as it changes', () => {
    let balance = 1000
    const following = createReconciliationSchema(() => balance)

    expect(following.safeParse({ informedBalance: 1012.4 }).success).toBe(false)

    balance = 1012.4

    expect(following.safeParse({ informedBalance: 1012.4 }).success).toBe(true)
  })
})

describe('toReconciliationForm', () => {
  it('builds the form for the server with the balance that was shown', () => {
    expect(toReconciliationForm({ informedBalance: 1012.4, reason: ' Centavos ' }, 1000)).toEqual({
      informedBalance: 1012.4,
      shownBalance: 1000,
      reason: 'Centavos',
    })
  })

  it('sends an empty reason when there is none', () => {
    expect(toReconciliationForm({ informedBalance: 1000 }, 1000).reason).toBe('')
  })
})
