import { describe, expect, it } from 'vitest'
import { COMPARTMENT_TYPE_ICONS, percentageOf, progressWidth } from '@/utils/compartments'
import { entryLabel, ORIGIN_APPEARANCE } from '@/utils/statement'
import type { WalletEntryView } from '@/types'

describe('compartment helpers', () => {
  it('has an icon for each type', () => {
    expect(Object.keys(COMPARTMENT_TYPE_ICONS)).toEqual(['RESERVE', 'INVESTMENT', 'GOAL'])
  })

  it('rounds the percentage down, so a goal never looks reached before it is', () => {
    expect(percentageOf(0.5833)).toBe(58)
    expect(percentageOf(0.9999)).toBe(99)
    expect(percentageOf(1.5)).toBe(150)
  })

  it('stops the bar at the full width', () => {
    expect(progressWidth(0.5)).toBe(50)
    expect(progressWidth(1.5)).toBe(100)
  })
})

describe('statement labels of the piggy bank operation', () => {
  const entry: WalletEntryView = {
    id: 'e-1',
    createdOn: '2026-11-20T14:02:00',
    name: 'Emergency',
    direction: 'DEBIT',
    origin: 'COMPARTMENT',
    value: 1,
    previousBalance: 1,
    resultingBalance: 0,
    financialPeriod: null,
    reference: null,
  }

  const translate = (key: string, named: Record<string, unknown>) => `${key}:${named.name}`

  it('says saved in the piggy bank for a debit and withdrawn from it for a credit', () => {
    expect(entryLabel(entry, translate)).toBe('statement.entry.compartment-deposit:Emergency')
    expect(entryLabel({ ...entry, direction: 'CREDIT' }, translate)).toBe(
      'statement.entry.compartment-withdrawal:Emergency',
    )
  })

  it('has its own appearance', () => {
    expect(ORIGIN_APPEARANCE.COMPARTMENT.variant).toBe('neutral')
  })
})
