import type { ImportAction, ImportLineView, ImportListView, ImportTarget } from '@/types'
import { cardLabel } from '@/utils/invoices'

export const IMPORT_ERROR_CODES = [
  'invalid-ofx-file',
  'unsupported-ofx-type',
  'card-statement-on-wallet',
  'account-statement-on-card',
  'no-open-invoice',
  'financial-period-not-open',
  'import-processing-failed',
] as const

type DestinationSource = Pick<ImportListView, 'target' | 'card' | 'wallet'>

export function importErrorCode(code: string | undefined): string {
  return IMPORT_ERROR_CODES.find((known) => known === code) ?? 'import-processing-failed'
}

export function destinationName(source: DestinationSource): string {
  return source.card ? cardLabel(source.card) : (source.wallet?.name ?? '')
}

export function destinationValue(target: ImportTarget, id: string): string {
  return `${target === 'CARD' ? 'card' : 'wallet'}:${id}`
}

export function retryQuery(
  source: DestinationSource & { financialPeriod: { id: string }; error?: string },
): Record<string, string> {
  const period = source.financialPeriod.id
  if (source.error === 'card-statement-on-wallet') {
    return { card: '', period }
  }
  if (source.error === 'account-statement-on-card') {
    return { wallet: '', period }
  }
  return source.card
    ? { card: source.card.id, period }
    : { wallet: source.wallet?.id ?? '', period }
}

export function fileSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export const CARD_ACTIONS: ImportAction[] = [
  'CREATE',
  'LINK',
  'LAUNCH_RECURRING',
  'CREATE_RECURRING',
  'IGNORE',
]

export const WALLET_ACTIONS: ImportAction[] = [
  'CREATE',
  'LINK',
  'INVOICE_PAYMENT',
  'TRANSFER',
  'IGNORE',
]

export const LINKING_ACTIONS: ImportAction[] = ['LINK', 'INVOICE_PAYMENT', 'LAUNCH_RECURRING']

export function isIncoming(line: Pick<ImportLineView, 'value'>): boolean {
  return line.value > 0
}

export function actionsOf(target: ImportTarget): ImportAction[] {
  return target === 'CARD' ? CARD_ACTIONS : WALLET_ACTIONS
}

export function missingKey(line: Pick<ImportLineView, 'action'>, reason: string): string {
  return reason === 'link' ? `link.${line.action}` : reason
}

export function fileDifference(line: Pick<ImportLineView, 'value' | 'link'>): number {
  return Math.abs(line.value) - (line.link?.value ?? 0)
}

export function timeOf(timestamp: string, locale: string): string {
  return new Date(timestamp).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}
