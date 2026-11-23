<script setup lang="ts">
import { computed } from 'vue'
import MenuItem from '@/components/layout/MenuItem.vue'
import type { MenuGroup } from '@/components/layout/menu'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@/components/ui/sidebar'

const props = defineProps<{ items: MenuGroup[]; flat?: boolean }>()

const groups = computed(() =>
  props.items.flatMap((group) => {
    if (props.flat) {
      return [group]
    }
    const split: MenuGroup[] = []
    let current: MenuGroup = { label: group.label, items: [] }
    for (const item of group.items) {
      if (item.group !== undefined) {
        split.push(current)
        current = { label: item.group, items: [] }
      }
      current.items.push(item)
    }
    split.push(current)
    return split.filter((candidate) => candidate.items.length > 0)
  }),
)
</script>

<template>
  <SidebarGroup v-for="group in groups" :key="group.label">
    <SidebarGroupLabel>{{ $t(group.label) }}</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        <MenuItem v-for="item in group.items" :key="item.label" :item="item" />
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
