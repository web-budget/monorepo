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

export const usersApi = {
  findAll(query: PageQuery): Promise<PagedResponse<UserView>> {
    return apiClient.get<PagedResponse<UserView>>(PATH, { params: query }).then((r) => r.data)
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

  remove(id: string): Promise<void> {
    return apiClient.delete(`${PATH}/${id}`).then(() => undefined)
  },
}
