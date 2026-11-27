import { toTypedSchema } from '@/schemas/typedSchema'
import { z } from 'zod'
import type { InstanceSettingsForm, InstanceSettingsView } from '@/types'

export const MINIMUM_RESERVE_MONTHS = 1

export const MAXIMUM_RESERVE_MONTHS = 24

const reserveMonthsSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.number().superRefine((value, context) => {
    if (
      !Number.isInteger(value) ||
      value < MINIMUM_RESERVE_MONTHS ||
      value > MAXIMUM_RESERVE_MONTHS
    ) {
      context.addIssue({ code: 'custom', params: { i18n: 'reserve-months-range' } })
    }
  }),
)

export const settingsSchema = z.object({ reserveMonths: reserveMonthsSchema })

export const settingsFormSchema = toTypedSchema(settingsSchema)

export type SettingsFormValues = z.infer<typeof settingsSchema>

export function toInstanceSettingsForm(values: SettingsFormValues): InstanceSettingsForm {
  return { reserveMonths: values.reserveMonths }
}

export function toSettingsFormValues(settings: InstanceSettingsView): SettingsFormValues {
  return { reserveMonths: settings.reserveMonths }
}
