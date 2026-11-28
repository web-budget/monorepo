import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import {
  actionsOf,
  compartmentTarget,
  fileDifference,
  isIncoming,
  LINKING_ACTIONS,
  missingKey,
  rejectionsOf,
  timeOf,
} from '@/utils/imports'
import type { ImportCandidateView } from '@/types'

describe('import line utils', () => {
  it('tells the incoming lines by the positive amount', () => {
    expect(isIncoming({ value: 50 })).toBe(true)
    expect(isIncoming({ value: -50 })).toBe(false)
  })

  it('has the actions of each destination, with the invoice payment and the transfer in the wallet only', () => {
    expect(actionsOf('CARD')).toEqual([
      'CREATE',
      'LINK',
      'LAUNCH_RECURRING',
      'CREATE_RECURRING',
      'IGNORE',
    ])
    expect(actionsOf('WALLET')).toEqual([
      'CREATE',
      'LINK',
      'INVOICE_PAYMENT',
      'TRANSFER',
      'COMPARTMENT',
      'IGNORE',
    ])
  })

  it('links with a link, an invoice payment or a recurring', () => {
    expect(LINKING_ACTIONS).toEqual(['LINK', 'INVOICE_PAYMENT', 'LAUNCH_RECURRING'])
  })

  it('names the missing link after the action and the other reasons by themselves', () => {
    expect(missingKey({ action: 'INVOICE_PAYMENT' }, 'link')).toBe('link.INVOICE_PAYMENT')
    expect(missingKey({ action: 'CREATE' }, 'cost-center')).toBe('cost-center')
  })

  it('measures the difference between the file and the linked entry', () => {
    const link = { value: 60 } as ImportCandidateView

    expect(fileDifference({ value: -100, link })).toBe(40)
    expect(fileDifference({ value: 50, link })).toBe(-10)
    expect(fileDifference({ value: -100 })).toBe(100)
  })

  it('writes the time of a timestamp for the locale', () => {
    expect(timeOf('2026-11-26T14:32:00', 'pt-BR')).toBe('14:32')
  })
})

describe('compartments of an import', () => {
  const refusal = (parameters?: Record<string, unknown>) =>
    new ApiError({ error: 'import-compartment-balance-exceeded', parameters }, 422)

  it('reads the refused lines of the balance error of the save', () => {
    const lines = [
      { id: 'l-1', position: 2, postedOn: '2026-11-22', compartment: 'Reserva', balance: 1000 },
    ]

    expect(rejectionsOf(refusal({ lines }))).toEqual(lines)
    expect(rejectionsOf(refusal())).toEqual([])
  })

  it('ignores any other error', () => {
    expect(rejectionsOf(new ApiError({ error: 'import-not-ready' }, 409))).toBeNull()
    expect(rejectionsOf(new Error('boom'))).toBeNull()
  })

  it('opens the history of the compartment with the movement, while it exists', () => {
    const line = {
      compartment: { id: 'k-1', name: 'Reserva', balance: 1 },
      compartmentMovement: 'mv-1',
    }

    expect(compartmentTarget(line, 'w-1')).toEqual({
      name: 'wallets.compartments.detail',
      params: { id: 'w-1', compartmentId: 'k-1' },
      query: { movement: 'mv-1' },
    })
    expect(compartmentTarget({ ...line, compartmentMovement: undefined }, 'w-1')).toBeNull()
    expect(compartmentTarget({ ...line, compartment: undefined }, 'w-1')).toBeNull()
    expect(compartmentTarget(line, undefined)).toBeNull()
  })
})
