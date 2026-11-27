import { apiClient } from './client'
import type { InstanceSettingsForm, InstanceSettingsView } from '@/types'

const PATH = '/administration/settings'

export const settingsApi = {
  find(): Promise<InstanceSettingsView> {
    return apiClient.get<InstanceSettingsView>(PATH).then((response) => response.data)
  },

  update(form: InstanceSettingsForm): Promise<InstanceSettingsView> {
    return apiClient.put<InstanceSettingsView>(PATH, form).then((response) => response.data)
  },
}
