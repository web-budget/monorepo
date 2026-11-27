import { describe, expect, it } from 'vitest'
import {
  actionsOf,
  fileDifference,
  isIncoming,
  LINKING_ACTIONS,
  missingKey,
  timeOf,
} from '@/utils/imports'
import type { ImportCandidateView } from '@/types'

describe('import line utils', () => {
  it('tells the incoming lines by the positive amount', () => {
    expect(isIncoming({ value: 50 })).toBe(true)
    expect(isIncoming({ value: -50 })).toBe(false)
  })

  it('has the actions of each destination, with the invoice payment and the transfer in the wallet only', () => {
    expect(actionsOf('CARD')).toEqual(['CREATE', 'LINK', 'LAUNCH_RECURRING', 'CREATE_RECURRING', 'IGNORE'])
    expect(actionsOf('WALLET')).toEqual(['CREATE', 'LINK', 'INVOICE_PAYMENT', 'TRANSFER', 'IGNORE'])
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
