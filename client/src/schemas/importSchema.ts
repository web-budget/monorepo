import { z } from 'zod'

export const importSchema = z
  .object({
    target: z.enum(['CARD', 'WALLET']),
    card: z.string(),
    wallet: z.string(),
    financialPeriod: z.string().min(1),
    file: z.instanceof(File),
  })
  .superRefine((values, context) => {
    const path = values.target === 'CARD' ? 'card' : 'wallet'
    if (!values[path]) {
      context.addIssue({ code: 'custom', path: [path], params: { i18n: 'required' } })
    }
  })

export type ImportFormValues = z.infer<typeof importSchema>

export function toImportFormData(values: ImportFormValues): FormData {
  const key = values.target === 'CARD' ? 'card' : 'wallet'
  const form = new FormData()
  form.append('financialPeriod', values.financialPeriod)
  form.append(key, values[key])
  form.append('file', values.file)
  return form
}
