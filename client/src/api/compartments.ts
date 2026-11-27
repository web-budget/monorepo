import { apiClient } from './client'
import { createdId } from './createdId'
import type {
  CompartmentCreateForm,
  CompartmentMovementForm,
  CompartmentMovementPosition,
  CompartmentMovementResult,
  CompartmentMovementView,
  CompartmentUpdateForm,
  CompartmentView,
  PagedResponse,
} from '@/types'

function registrationPath(walletId: string) {
  return `/registration/wallets/${encodeURIComponent(walletId)}/compartments`
}

function financialPath(walletId: string, compartmentId: string) {
  return `/financial/wallets/${encodeURIComponent(walletId)}/compartments/${encodeURIComponent(compartmentId)}/movements`
}

export interface MovementsQuery {
  page?: number
  size?: number
  sort?: string
}

export const compartmentsApi = {
  findAll(walletId: string): Promise<CompartmentView[]> {
    return apiClient.get<CompartmentView[]>(registrationPath(walletId)).then((r) => r.data)
  },

  findById(walletId: string, compartmentId: string): Promise<CompartmentView> {
    return apiClient
      .get<CompartmentView>(`${registrationPath(walletId)}/${encodeURIComponent(compartmentId)}`)
      .then((r) => r.data)
  },

  create(walletId: string, form: CompartmentCreateForm): Promise<string> {
    return apiClient.post(registrationPath(walletId), form).then(createdId)
  },

  update(
    walletId: string,
    compartmentId: string,
    form: CompartmentUpdateForm,
  ): Promise<CompartmentView> {
    return apiClient
      .put<CompartmentView>(
        `${registrationPath(walletId)}/${encodeURIComponent(compartmentId)}`,
        form,
      )
      .then((r) => r.data)
  },

  remove(walletId: string, compartmentId: string): Promise<void> {
    return apiClient
      .delete(`${registrationPath(walletId)}/${encodeURIComponent(compartmentId)}`)
      .then(() => undefined)
  },

  move(
    walletId: string,
    compartmentId: string,
    form: CompartmentMovementForm,
  ): Promise<CompartmentMovementResult> {
    return apiClient
      .post<CompartmentMovementResult>(financialPath(walletId, compartmentId), form)
      .then((r) => r.data)
  },

  findMovements(
    walletId: string,
    compartmentId: string,
    query: MovementsQuery,
  ): Promise<PagedResponse<CompartmentMovementView>> {
    return apiClient
      .get<PagedResponse<CompartmentMovementView>>(financialPath(walletId, compartmentId), {
        params: query,
      })
      .then((r) => r.data)
  },

  findPosition(
    walletId: string,
    compartmentId: string,
    movementId: string,
    sort?: string,
  ): Promise<CompartmentMovementPosition> {
    return apiClient
      .get<CompartmentMovementPosition>(
        `${financialPath(walletId, compartmentId)}/${encodeURIComponent(movementId)}/position`,
        { params: { sort } },
      )
      .then((r) => r.data)
  },
}
