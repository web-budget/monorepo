import { describe, expect, it } from 'vitest'
import type { ImportCandidateView, ImportLineView } from '@/types'
import { resultTarget } from '@/utils/imports'

function candidate(kind: ImportCandidateView['kind'], id: string) {
  return { kind, id } as ImportCandidateView
}

function line(overrides: Partial<ImportLineView>) {
  return { action: 'CREATE', created: [], ...overrides } as ImportLineView
}

describe('resultTarget', () => {
  it('points to what the line created, leaving the recurring behind the entry', () => {
    expect(
      resultTarget(
        line({ created: [candidate('RECURRING', 'r-1'), candidate('MOVEMENT', 'm-1')] }),
      ),
    ).toEqual({ name: 'movements.detail', params: { id: 'm-1' } })
    expect(resultTarget(line({ created: [candidate('PURCHASE', 'pu-1')] }))).toEqual({
      name: 'purchases.detail',
      params: { id: 'pu-1' },
    })
    expect(resultTarget(line({ created: [candidate('TRANSFER', 't-1')] }))).toEqual({
      name: 'transfers.detail',
      params: { id: 't-1' },
    })
  })

  it('points to the linked entry when nothing was created', () => {
    expect(
      resultTarget(line({ action: 'LINK', link: candidate('MOVEMENT', 'm-2') })),
    ).toEqual({ name: 'movements.detail', params: { id: 'm-2' } })
  })

  it('falls back to the recurring when it is all there is', () => {
    expect(resultTarget(line({ created: [candidate('RECURRING', 'r-1')] }))).toEqual({
      name: 'recurring-movements.detail',
      params: { id: 'r-1' },
    })
  })

  it('points nowhere for an ignored line or one with nothing generated', () => {
    expect(
      resultTarget(line({ action: 'IGNORE', created: [candidate('MOVEMENT', 'm-1')] })),
    ).toBeNull()
    expect(resultTarget(line({}))).toBeNull()
  })
})
