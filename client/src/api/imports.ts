import { apiClient } from './client'
import type {
  ImportCandidateView,
  ImportCounts,
  ImportCreated,
  ImportLineQuery,
  ImportLinesBatchForm,
  ImportLineUpdateForm,
  ImportLineView,
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

  findLines(id: string, query: ImportLineQuery): Promise<PagedResponse<ImportLineView>> {
    return apiClient
      .get<PagedResponse<ImportLineView>>(`${PATH}/${encodeURIComponent(id)}/lines`, {
        params: { ...query, actions: query.actions?.join(',') },
      })
      .then((response) => response.data)
  },

  updateLine(id: string, lineId: string, form: ImportLineUpdateForm): Promise<ImportLineView> {
    return apiClient
      .patch<ImportLineView>(
        `${PATH}/${encodeURIComponent(id)}/lines/${encodeURIComponent(lineId)}`,
        form,
      )
      .then((response) => response.data)
  },

  updateLines(id: string, form: ImportLinesBatchForm): Promise<void> {
    return apiClient
      .patch(`${PATH}/${encodeURIComponent(id)}/lines`, form)
      .then(() => undefined)
  },

  candidates(id: string, lineId: string): Promise<ImportCandidateView[]> {
    return apiClient
      .get<ImportCandidateView[]>(
        `${PATH}/${encodeURIComponent(id)}/lines/${encodeURIComponent(lineId)}/candidates`,
      )
      .then((response) => response.data)
  },

  save(id: string): Promise<ImportView> {
    return apiClient
      .post<ImportView>(`${PATH}/${encodeURIComponent(id)}/save`)
      .then((response) => response.data)
  },
}
