<script setup lang="ts">
import BrandMark from '@/components/brand/BrandMark.vue'
import BrandWordmark from '@/components/brand/BrandWordmark.vue'
import MobileMenu from '@/components/layout/MobileMenu.vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar'

const props = defineProps<{ enableSideMenu: boolean }>()

const { isMobile } = useSidebar()
const version = __APP_VERSION__
</script>

<template>
  <Sidebar v-if="props.enableSideMenu || isMobile" collapsible="icon">
    <MobileMenu v-if="isMobile" />
    <template v-else>
      <SidebarHeader
        class="border-sidebar-border h-14 shrink-0 flex-row items-center gap-2.5 border-b px-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
      >
        <RouterLink to="/" class="flex items-center gap-2.5 text-[17px]">
          <BrandMark :size="26" />
          <BrandWordmark class="group-data-[collapsible=icon]:hidden" />
        </RouterLink>
      </SidebarHeader>
      <SidebarContent>
        <slot name="side-menu" />
      </SidebarContent>
      <SidebarFooter
        class="border-sidebar-border text-muted-foreground border-t px-4 py-3 font-mono text-[11px] group-data-[collapsible=icon]:hidden"
      >
        webBudget v{{ version }}
      </SidebarFooter>
    </template>
  </Sidebar>
</template>
