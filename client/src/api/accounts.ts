import { apiClient } from './client'
import type { ActivateAccountForm, ForgotPasswordForm, RecoverPasswordForm } from '@/types'

export const accountsApi = {
  activate(form: ActivateAccountForm): Promise<void> {
    return apiClient.patch('/accounts/activate', form).then(() => undefined)
  },

  forgotPassword(form: ForgotPasswordForm): Promise<void> {
    return apiClient.patch('/accounts/forgot-password', form).then(() => undefined)
  },

  recoverPassword(form: RecoverPasswordForm): Promise<void> {
    return apiClient.patch('/accounts/recover-password', form).then(() => undefined)
  },
}
