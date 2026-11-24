import { apiClient } from './client'
import type { InvoiceQuery, InvoiceView, PagedResponse } from '@/types'

const PATH = '/financial/invoices'

export const invoicesApi = {
  findAll(query: InvoiceQuery): Promise<PagedResponse<InvoiceView>> {
    const params = { ...query, statuses: query.statuses?.join(',') }
    return apiClient
      .get<PagedResponse<InvoiceView>>(PATH, { params })
      .then((response) => response.data)
  },

  findById(id: string): Promise<InvoiceView> {
    return apiClient
      .get<InvoiceView>(`${PATH}/${encodeURIComponent(id)}`)
      .then((response) => response.data)
  },

  close(id: string): Promise<InvoiceView> {
    return apiClient
      .patch<InvoiceView>(`${PATH}/${encodeURIComponent(id)}/close`)
      .then((response) => response.data)
  },
}
