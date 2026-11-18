<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import type { MenuItemDefinition } from '@/components/layout/menu'

const props = defineProps<{ item: MenuItemDefinition }>()

const route = useRoute()
const { setOpenMobile } = useSidebar()

const active = computed(() => props.item.to !== undefined && route.path.startsWith(props.item.to))
</script>

<template>
  <SidebarMenuItem v-if="props.item.visible !== false">
    <SidebarMenuButton
      v-if="props.item.to"
      as-child
      :is-active="active"
      :tooltip="$t(props.item.label)"
    >
      <RouterLink :to="props.item.to" @click="setOpenMobile(false)">
        <component :is="props.item.icon" v-if="props.item.icon" />
        <span :class="{ marker: active }">{{ $t(props.item.label) }}</span>
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
