import { defineStore } from 'pinia'
import { ref } from 'vue'
import { rolesApi } from '@/api/roles'
import { usersApi } from '@/api/users'
import { useCrudResource } from '@/composables/useCrudResource'
import { createPageRequest } from '@/utils/pageRequest'
import type { UserPasswordForm, UserStatusFilter, UserView } from '@/types'

export const INITIAL_USER_STATUS: UserStatusFilter = 'APPROVED'

export const useUsersAdminStore = defineStore('usersAdmin', () => {
  const resource = useCrudResource(usersApi, () =>
    createPageRequest<UserStatusFilter>({ status: INITIAL_USER_STATUS }),
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

  function approve(user: UserView, grantedRoles: string[]): Promise<void> {
    return resource.track(async () => {
      await usersApi.update(user.id, {
        active: user.active,
        name: user.name,
        defaultLanguage: user.defaultLanguage,
        roles: grantedRoles,
      })
      await usersApi.approve(user.id)
    })
  }

  function block(id: string): Promise<void> {
    return resource.track(() => usersApi.block(id))
  }

  function unblock(id: string): Promise<void> {
    return resource.track(() => usersApi.unblock(id))
  }

  function resetTotp(id: string): Promise<void> {
    return resource.track(() => usersApi.resetTotp(id))
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
    approve,
    block,
    unblock,
    resetTotp,
    remove: resource.remove,
    reset,
  }
})
