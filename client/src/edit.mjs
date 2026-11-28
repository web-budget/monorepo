import fs from 'node:fs'
let s = fs.readFileSync('stores/statement.ts','utf8')
s = s.replace(`function amountOf(text: string | undefined): number | undefined {
  const amount = Number(text)
  return text && Number.isFinite(amount) ? amount : undefined
}
`, `function amountOf(text: string | undefined): number | undefined {
  const amount = Number(text)
  return text && Number.isFinite(amount) ? amount : undefined
}

export function sanitizeStatementFilters(values: ExtraQuery): ExtraQuery {
  return {
    ...values,
    origin: WALLET_ENTRY_ORIGINS.some((origin) => origin === values.origin) ? values.origin! : '',
    min: amountOf(values.min) === undefined ? '' : values.min!,
    max: amountOf(values.max) === undefined ? '' : values.max!,
  }
}
`)
fs.writeFileSync('stores/statement.ts', s)
let v = fs.readFileSync('views/financial/statement/StatementView.vue','utf8')
v = v.replace(`    sanitize: (values) => ({
      ...values,
      origin: WALLET_ENTRY_ORIGINS.some((origin) => origin === values.origin) ? values.origin! : '',
    }),
`, `    sanitize: sanitizeStatementFilters,
`)
v = v.replace(`import { STATEMENT_FILTER_KEYS, useStatementStore, WALLET_ENTRY_ORIGINS } from '@/stores/statement'`, `import {
  sanitizeStatementFilters,
  STATEMENT_FILTER_KEYS,
  useStatementStore,
  WALLET_ENTRY_ORIGINS,
} from '@/stores/statement'`)
fs.writeFileSync('views/financial/statement/StatementView.vue', v)
