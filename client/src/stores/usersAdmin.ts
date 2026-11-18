import { defineStore } from 'pinia'
import { ref } from 'vue'
import { rolesApi } from '@/api/roles'
import { usersApi } from '@/api/users'
import { useCrudResource } from '@/composables/useCrudResource'
import { createPageRequest } from '@/utils/pageRequest'
import type { StatusFilter, UserPasswordForm } from '@/types'

export const useUsersAdminStore = defineStore('usersAdmin', () => {
  const resource = useCrudResource(usersApi, () =>
    createPageRequest<StatusFilter>({ status: 'ALL' }),
  )
  const roles = ref<string[]>([])

  function findRoles(): Promise<void> {
    return resource.track(async () => {
      roles.value = await rolesApi.findAll()
    })
  }

  function updatePassword(id: string, form: UserPasswordForm): Promise<void> {
    return resource.track(() => usersApi.updatePassword(id, form))
  }

  function reset() {
    resource.reset()
    roles.value = []
  }

  return {
    user: resource.current,
    roles,
    pageRequest: resource.pageRequest,
    pageResponse: resource.pageResponse,
    loading: resource.loading,
    findAll: resource.findAll,
    count: resource.count,
    findOne: resource.findOne,
    findRoles,
    create: resource.create,
    update: resource.update,
    updatePassword,
    remove: resource.remove,
    reset,
  }
})
