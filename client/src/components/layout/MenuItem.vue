<script setup lang="ts">
import { useRoute } from 'vue-router'
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import type { MenuItemDefinition } from '@/components/layout/menu'

const props = defineProps<{ item: MenuItemDefinition }>()

const route = useRoute()
const { setOpenMobile } = useSidebar()

function isActive(to: string): boolean {
  return props.item.exact ? route.path === to : route.path.startsWith(to)
}
</script>

<template>
  <SidebarMenuItem v-if="props.item.visible !== false">
    <SidebarMenuButton
      v-if="props.item.to"
      as-child
      :is-active="isActive(props.item.to)"
      :tooltip="$t(props.item.label)"
    >
      <RouterLink :to="props.item.to" @click="setOpenMobile(false)">
        <component :is="props.item.icon" v-if="props.item.icon" />
        <span :class="{ marker: isActive(props.item.to) }">{{ $t(props.item.label) }}</span>
      </RouterLink>
    </SidebarMenuButton>
    <SidebarMenuButton
      v-else
      disabled
      :title="$t('layout.coming-soon')"
      :tooltip="$t(props.item.label)"
    >
      <component :is="props.item.icon" v-if="props.item.icon" />
      <span>{{ $t(props.item.label) }}</span>
    </SidebarMenuButton>
  </SidebarMenuItem>
</template>
