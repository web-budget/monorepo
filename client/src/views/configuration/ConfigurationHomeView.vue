<script setup lang="ts">
import ModuleHome from '@/components/layout/ModuleHome.vue'
import { configurationSection } from '@/components/layout/sections'
import { useModuleCounts } from '@/composables/useModuleCounts'
import { useUsersAdminStore } from '@/stores/usersAdmin'

const users = useUsersAdminStore()

const { counts } = useModuleCounts({
  '/configuration/users': () => users.count('ALL'),
})
</script>

<template>
  <ModuleHome
    :section="configurationSection"
    description="module-home.description.configuration"
    :counts="counts"
  />
</template>
