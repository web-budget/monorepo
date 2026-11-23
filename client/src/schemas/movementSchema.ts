import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import { blankToNull, optionalNumberSchema } from '@/schemas/fields'
import type {
  MovementCreateForm,
  MovementType,
  MovementUpdateForm,
  MovementView,
  PaymentForm,
} from '@/types'
import { formatLocalDate } from '@/utils/localDate'

export const MOVEMENT_TYPES = ['EXPENSE', 'INCOME'] as const

function discountBelowValue(
  values: { discount: number | null },
  value: number | undefined,
  context: z.RefinementCtx,
) {
  if (values.discount !== null && value !== undefined && values.discount >= value) {
    context.addIssue({ code: 'custom', path: ['discount'], params: { i18n: 'discount-too-high' } })
  }
}

export const movementSchema = z
  .object({
    type: z.enum(MOVEMENT_TYPES),
    name: z.string().min(1).max(150),
    value: z.number().positive(),
    dueDate: z.string().nullish(),
    financialPeriod: z.string().min(1),
    costCenter: z.string().min(1),
    classification: z.string().min(1),
    description: z.string().nullish(),
    paid: z.boolean(),
    paidOn: z.string().nullish(),
    wallet: z.string().nullish(),
    discount: optionalNumberSchema(z.number().min(0)),
  })
  .superRefine((values, context) => {
    if (!values.paid) {
      return
    }
    for (const field of ['paidOn', 'wallet'] as const) {
      if (!values[field]) {
        context.addIssue({ code: 'custom', path: [field], params: { i18n: 'required' } })
      }
    }
    discountBelowValue(values, values.value, context)
  })

export const movementFormSchema = toTypedSchema(movementSchema)

export type MovementFormValues = z.infer<typeof movementSchema>

export function movementFormDefaults() {
  return { type: 'EXPENSE' as MovementType, paid: false, paidOn: formatLocalDate(new Date()) }
}

export function createPaymentSchema(movementValue: () => number) {
  return toTypedSchema(
    z
      .object({
        paidOn: z.string().min(1),
        wallet: z.string().min(1),
        discount: optionalNumberSchema(z.number().min(0)),
      })
      .superRefine((values, context) => discountBelowValue(values, movementValue(), context)),
  )
}

export type PaymentFormValues = {
  paidOn: string
  wallet: string
  discount: number | null
}

export function toPaymentForm(values: PaymentFormValues): PaymentForm {
  return { wallet: values.wallet, paidOn: values.paidOn, discount: values.discount }
}

export function toMovementCreateForm(values: MovementFormValues): MovementCreateForm {
  return {
    name: values.name,
    type: values.type,
    value: values.value,
    dueDate: blankToNull(values.dueDate),
    financialPeriod: values.financialPeriod,
    costCenter: values.costCenter,
    classification: values.classification,
    description: blankToNull(values.description),
    payment:
      values.paid && values.wallet
        ? toPaymentForm({
            paidOn: values.paidOn ?? '',
            wallet: values.wallet,
            discount: values.discount,
          })
        : null,
  }
}

export function toMovementUpdateForm(values: MovementFormValues): MovementUpdateForm {
  return {
    name: values.name,
    value: values.value,
    dueDate: blankToNull(values.dueDate),
    costCenter: values.costCenter,
    classification: values.classification,
    description: blankToNull(values.description),
  }
}

export function toMovementFormValues(movement: MovementView): Partial<MovementFormValues> {
  return {
    type: movement.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
    name: movement.name,
    value: movement.value,
    dueDate: movement.dueDate,
    financialPeriod: movement.financialPeriod.id,
    costCenter: movement.costCenter?.id,
    classification: movement.classification?.id,
    description: movement.description,
    paid: false,
  }
}
