import { apiClient } from './client'
import type { MailSettingsForm, MailSettingsView } from '@/types'

const PATH = '/administration/mail-settings'

export const mailSettingsApi = {
  find(): Promise<MailSettingsView> {
    return apiClient.get<MailSettingsView>(PATH).then((response) => response.data)
  },

  update(form: MailSettingsForm): Promise<MailSettingsView> {
    return apiClient.put<MailSettingsView>(PATH, form).then((response) => response.data)
  },

  updateEnabled(enabled: boolean): Promise<MailSettingsView> {
    return apiClient
      .patch<MailSettingsView>(`${PATH}/enabled`, { enabled })
      .then((response) => response.data)
  },

  sendTest(recipient: string): Promise<void> {
    return apiClient.post(`${PATH}/test`, { recipient }).then(() => undefined)
  },
}
