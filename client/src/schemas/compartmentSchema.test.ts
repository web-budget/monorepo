import { describe, expect, it } from 'vitest'
import {
  compartmentSchema,
  isGoal,
  toCompartmentCreateForm,
  toCompartmentFormValues,
  toCompartmentUpdateForm,
} from '@/schemas/compartmentSchema'
import {
  compartmentMovementSchema,
  toCompartmentMovementForm,
} from '@/schemas/compartmentMovementSchema'
import type { CompartmentView } from '@/types'

const trip: CompartmentView = {
  id: 'k-1',
  name: 'Trip',
  type: 'GOAL',
  balance: 10,
  statementEntryCount: 0,
  achieved: false,
  overdue: false,
  description: 'Beach',
  targetValue: 1800,
  targetDate: '2027-02-10',
}

describe('compartmentSchema', () => {
  it('asks for a name and a type and accepts the goal fields as optional', () => {
    expect(compartmentSchema.safeParse({}).success).toBe(false)
    expect(compartmentSchema.safeParse({ name: 'A', type: 'OTHER' }).success).toBe(false)
    expect(compartmentSchema.safeParse({ name: 'A', type: 'RESERVE' }).success).toBe(true)
    expect(
      compartmentSchema.safeParse({ name: 'A', type: 'GOAL', targetValue: '', targetDate: '' })
        .success,
    ).toBe(true)
    expect(compartmentSchema.safeParse({ name: 'A', type: 'GOAL', targetValue: 0 }).success).toBe(
      false,
    )
  })

  it('knows the goal type', () => {
    expect(isGoal('GOAL')).toBe(true)
    expect(isGoal('RESERVE')).toBe(false)
    expect(isGoal(undefined)).toBe(false)
  })

  it('sends the goal fields only for a goal, without blanks', () => {
    expect(
      toCompartmentCreateForm({
        name: ' Trip ',
        type: 'GOAL',
        description: 'Beach',
        targetValue: 1800,
        targetDate: '2027-02-10',
      }),
    ).toEqual({
      name: 'Trip',
      type: 'GOAL',
      description: 'Beach',
      targetValue: 1800,
      targetDate: '2027-02-10',
    })
    expect(
      toCompartmentCreateForm({
        name: 'Open',
        type: 'GOAL',
        description: ' ',
        targetValue: null,
        targetDate: '',
      }),
    ).toEqual({
      name: 'Open',
      type: 'GOAL',
      description: null,
      targetValue: null,
      targetDate: null,
    })
    expect(
      toCompartmentCreateForm({
        name: 'Reserve',
        type: 'RESERVE',
        description: 'ignored',
        targetValue: 5,
        targetDate: '2027-01-01',
      }),
    ).toEqual({
      name: 'Reserve',
      type: 'RESERVE',
      description: null,
      targetValue: null,
      targetDate: null,
    })
  })

  it('sends no type when updating', () => {
    expect(
      toCompartmentUpdateForm({ name: 'Trip', type: 'GOAL', description: 'Beach', targetValue: 9 }),
    ).toEqual({ name: 'Trip', description: 'Beach', targetValue: 9, targetDate: null })
  })

  it('fills the form from a piggy bank, with blanks for what it does not have', () => {
    expect(toCompartmentFormValues(trip)).toEqual({
      name: 'Trip',
      type: 'GOAL',
      description: 'Beach',
      targetValue: 1800,
      targetDate: '2027-02-10',
    })
    expect(
      toCompartmentFormValues({
        ...trip,
        description: null,
        targetValue: null,
        targetDate: undefined,
      }),
    ).toMatchObject({ description: '', targetValue: null, targetDate: '' })
  })
})

describe('compartmentMovementSchema', () => {
  it('needs a direction, a piggy bank and a positive value, with a short note', () => {
    expect(compartmentMovementSchema.safeParse({}).success).toBe(false)
    expect(
      compartmentMovementSchema.safeParse({ direction: 'DEPOSIT', compartment: 'k', value: 0 })
        .success,
    ).toBe(false)
    expect(
      compartmentMovementSchema.safeParse({
        direction: 'DEPOSIT',
        compartment: 'k',
        value: 1,
        note: 'a'.repeat(151),
      }).success,
    ).toBe(false)
    expect(
      compartmentMovementSchema.safeParse({ direction: 'WITHDRAWAL', compartment: 'k', value: 1 })
        .success,
    ).toBe(true)
  })

  it('builds the form for the server without the piggy bank and with a null blank note', () => {
    expect(
      toCompartmentMovementForm({ direction: 'DEPOSIT', compartment: 'k', value: 5, note: ' ' }),
    ).toEqual({ direction: 'DEPOSIT', value: 5, note: null })
    expect(
      toCompartmentMovementForm({
        direction: 'WITHDRAWAL',
        compartment: 'k',
        value: 5,
        note: 'Car',
      }),
    ).toEqual({ direction: 'WITHDRAWAL', value: 5, note: 'Car' })
  })
})
