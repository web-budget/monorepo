import { describe, expect, it } from 'vitest'
import {
  toCostCenterCreateForm,
  toCostCenterFormValues,
  toCostCenterUpdateForm,
} from '@/schemas/costCenterSchema'
import type { CostCenterView } from '@/types'

const view: CostCenterView = {
  id: 'cc-1',
  name: 'Home',
  active: false,
  description: null,
  incomeBudget: null,
  expenseBudget: 10,
  parentCostCenter: null,
}

describe('costCenterSchema mapping', () => {
  it('fills the form from a cost center without parent', () => {
    expect(toCostCenterFormValues(view)).toEqual({
      active: false,
      name: 'Home',
      parentCostCenter: null,
      incomeBudget: null,
      expenseBudget: 10,
      description: null,
    })
  })

  it('shows the parent by its full name', () => {
    const values = toCostCenterFormValues({
      ...view,
      parentCostCenter: { ...view, id: 'cc-0', fullName: 'Root > Home', name: 'Home' } as never,
    })

    expect(values.parentCostCenter).toEqual({ id: 'cc-0', label: 'Root > Home' })
  })

  it('sends the parent id and drops blank text', () => {
    const values = {
      active: true,
      name: 'Kitchen',
      description: '  ',
      incomeBudget: null,
      expenseBudget: 5,
      parentCostCenter: { id: 'cc-1', label: 'Home' },
    }

    expect(toCostCenterCreateForm(values)).toEqual({
      name: 'Kitchen',
      description: null,
      incomeBudget: null,
      expenseBudget: 5,
      parentCostCenter: 'cc-1',
    })
    expect(toCostCenterUpdateForm(values)).toMatchObject({ active: true, parentCostCenter: 'cc-1' })
  })
})
