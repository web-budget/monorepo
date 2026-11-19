<script setup lang="ts">
import MenuItem from '@/components/layout/MenuItem.vue'
import type { MenuGroup } from '@/components/layout/menu'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@/components/ui/sidebar'

const props = defineProps<{ items: MenuGroup[] }>()
</script>

<template>
  <SidebarGroup v-for="group in props.items" :key="group.label">
    <SidebarGroupLabel>{{ $t(group.label) }}</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        <MenuItem v-for="item in group.items" :key="item.label" :item="item" />
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
