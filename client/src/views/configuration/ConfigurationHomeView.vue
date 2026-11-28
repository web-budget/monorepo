<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ModuleHome from '@/components/layout/ModuleHome.vue'
import { configurationSection } from '@/components/layout/sections'
import { useModuleCounts } from '@/composables/useModuleCounts'
import { useMailSettingsStore } from '@/stores/mailSettings'
import { useUsersAdminStore } from '@/stores/usersAdmin'
import { markHandled } from '@/utils/handledErrors'

const MAIL = '/configuration/mail'

const { t } = useI18n()
const users = useUsersAdminStore()
const mail = useMailSettingsStore()

async function safely<T>(operation: () => Promise<T>): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    markHandled(error)
    return null
  }
}

const mailSettings = safely(() => mail.find())

const { counts } = useModuleCounts<number | string>({
  '/configuration/users': () => users.count('ALL'),
  [MAIL]: async () => {
    const settings = await mailSettings
    if (settings === null || !settings.configured) {
      return null
    }
    return t(settings.enabled ? 'mail-settings.home.on' : 'mail-settings.home.off')
  },
})

const { counts: attentions } = useModuleCounts<string>({
  [MAIL]: async () => {
    const settings = await mailSettings
    return settings !== null && !settings.configured ? t('mail-settings.home.no-server') : null
  },
})
</script>

<template>
  <ModuleHome
    :section="configurationSection"
    description="module-home.description.configuration"
    :counts="counts"
    :attentions="attentions"
  />
</template>
