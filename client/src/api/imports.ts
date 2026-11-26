import { apiClient } from './client'
import type {
  ImportCounts,
  ImportCreated,
  ImportListView,
  ImportQuery,
  ImportView,
  PagedResponse,
} from '@/types'

const PATH = '/financial/imports'

function toParams(query: ImportQuery) {
  return { ...query, statuses: query.statuses?.join(',') }
}

export const importsApi = {
  findAll(query: ImportQuery): Promise<PagedResponse<ImportListView>> {
    return apiClient
      .get<PagedResponse<ImportListView>>(PATH, { params: toParams(query) })
      .then((response) => response.data)
  },

  counts(query: ImportQuery): Promise<ImportCounts> {
    return apiClient
      .get<ImportCounts>(`${PATH}/counts`, { params: toParams({ ...query, statuses: undefined }) })
      .then((response) => response.data)
  },

  findById(id: string, silent = false): Promise<ImportView> {
    return apiClient
      .get<ImportView>(`${PATH}/${encodeURIComponent(id)}`, { silent })
      .then((response) => response.data)
  },

  create(form: FormData): Promise<ImportCreated> {
    return apiClient.post<ImportCreated>(PATH, form).then((response) => response.data)
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`${PATH}/${encodeURIComponent(id)}`).then(() => undefined)
  },
}
