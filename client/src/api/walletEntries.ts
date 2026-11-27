import { apiClient } from './client'
import type {
  PagedResponse,
  StatementQuery,
  StatementSummary,
  WalletEntryView,
} from '@/types'

const PATH = '/financial/wallets'

function statementPath(walletId: string) {
  return `${PATH}/${encodeURIComponent(walletId)}/statement`
}

function toParams(query: StatementQuery) {
  return { ...query, origins: query.origins?.join(',') }
}

export const walletEntriesApi = {
  findStatement(walletId: string, query: StatementQuery): Promise<PagedResponse<WalletEntryView>> {
    return apiClient
      .get<PagedResponse<WalletEntryView>>(statementPath(walletId), { params: toParams(query) })
      .then((response) => response.data)
  },

  findSummary(walletId: string, query: StatementQuery): Promise<StatementSummary> {
    return apiClient
      .get<StatementSummary>(`${statementPath(walletId)}/summary`, { params: toParams(query) })
      .then((response) => response.data)
  },

  findEntry(walletId: string, entryId: string): Promise<WalletEntryView> {
    return apiClient
      .get<WalletEntryView>(`${statementPath(walletId)}/${encodeURIComponent(entryId)}`)
      .then((response) => response.data)
  },
}
