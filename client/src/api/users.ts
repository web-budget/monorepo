import { apiClient } from './client'
import { createdId } from './createdId'
import type {
  PagedResponse,
  PageQuery,
  UserCreateForm,
  UserPasswordForm,
  UserUpdateForm,
  UserView,
} from '@/types'

const PATH = '/administration/users'

const USER_STATUSES = ['PENDING', 'APPROVED', 'BLOCKED']

function toUserQuery(query: PageQuery) {
  if (query.status !== undefined && USER_STATUSES.includes(query.status)) {
    return { ...query, status: 'ALL', userStatus: query.status }
  }
  return query
}

function patch(id: string, action: string): Promise<void> {
  return apiClient.patch(`${PATH}/${id}/${action}`).then(() => undefined)
}

export const usersApi = {
  findAll(query: PageQuery): Promise<PagedResponse<UserView>> {
    return apiClient
      .get<PagedResponse<UserView>>(PATH, { params: toUserQuery(query) })
      .then((r) => r.data)
  },

  findById(id: string): Promise<UserView> {
    return apiClient.get<UserView>(`${PATH}/${id}`).then((r) => r.data)
  },

  create(form: UserCreateForm): Promise<string> {
    return apiClient.post(PATH, form).then(createdId)
  },

  update(id: string, form: UserUpdateForm): Promise<UserView> {
    return apiClient.put<UserView>(`${PATH}/${id}`, form).then((r) => r.data)
  },

  updatePassword(id: string, form: UserPasswordForm): Promise<void> {
    return apiClient.patch(`${PATH}/${id}/update-password`, form).then(() => undefined)
  },

  approve(id: string): Promise<void> {
    return patch(id, 'approve')
  },

  block(id: string): Promise<void> {
    return patch(id, 'block')
  },

  unblock(id: string): Promise<void> {
    return patch(id, 'unblock')
  },

  resetTotp(id: string): Promise<void> {
    return patch(id, 'totp-reset')
  },

  remove(id: string): Promise<void> {
    return apiClient.delete(`${PATH}/${id}`).then(() => undefined)
  },
}
