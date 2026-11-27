import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import type { ReconciliationForm } from '@/types'

export const RECONCILIATION_REASON_MAXIMUM = 150

const CENTS = 100

export function reconciliationDifference(informedBalance: number, walletBalance: number): number {
  return Math.round((informedBalance - walletBalance) * CENTS) / CENTS
}

export function createReconciliationSchema(walletBalance: () => number) {
  return z
    .object({
      informedBalance: z.any(),
      reason: z.string().max(RECONCILIATION_REASON_MAXIMUM).optional(),
    })
    .superRefine((values, context) => {
      const informed: unknown = values.informedBalance
      if (informed === null || informed === undefined || informed === '') {
        context.addIssue({
          code: 'custom',
          path: ['informedBalance'],
          params: { i18n: 'reconciliation-balance-required' },
        })
        return
      }
      if (typeof informed !== 'number' || !Number.isFinite(informed)) {
        context.addIssue({
          code: 'custom',
          path: ['informedBalance'],
          params: { i18n: 'reconciliation-balance-invalid' },
        })
        return
      }
      const hasDifference = reconciliationDifference(informed, walletBalance()) !== 0
      if (hasDifference && !values.reason?.trim()) {
        context.addIssue({
          code: 'custom',
          path: ['reason'],
          params: { i18n: 'reconciliation-reason-required' },
        })
      }
    })
}

export function createReconciliationFormSchema(walletBalance: () => number) {
  return toTypedSchema(createReconciliationSchema(walletBalance))
}

export interface ReconciliationFormValues {
  informedBalance: number
  reason?: string
}

export function toReconciliationForm(
  values: ReconciliationFormValues,
  shownBalance: number,
): ReconciliationForm {
  return {
    informedBalance: values.informedBalance,
    shownBalance,
    reason: (values.reason ?? '').trim(),
  }
}
