import { defineStore } from 'pinia'
import { ref } from 'vue'
import { accountsApi } from '@/api/accounts'
import type { ActivateAccountForm, ForgotPasswordForm, RecoverPasswordForm } from '@/types'

export const useAccountStore = defineStore('account', () => {
  const loading = ref(false)

  async function track(operation: () => Promise<void>): Promise<void> {
    loading.value = true
    try {
      await operation()
    } finally {
      loading.value = false
    }
  }

  function activate(form: ActivateAccountForm): Promise<void> {
    return track(() => accountsApi.activate(form))
  }

  function forgotPassword(form: ForgotPasswordForm): Promise<void> {
    return track(() => accountsApi.forgotPassword(form))
  }

  function recoverPassword(form: RecoverPasswordForm): Promise<void> {
    return track(() => accountsApi.recoverPassword(form))
  }

  function reset() {
    loading.value = false
  }

  return { loading, activate, forgotPassword, recoverPassword, reset }
})
