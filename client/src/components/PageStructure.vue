<script setup lang="ts">
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'
import PageFooter from '@/components/layout/PageFooter.vue'
import TopBar from '@/components/layout/TopBar.vue'
import { Sidebar, SidebarContent, SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

const props = withDefaults(defineProps<{ enableSideMenu?: boolean }>(), { enableSideMenu: true })
</script>

<template>
  <SidebarProvider>
    <Sidebar v-if="props.enableSideMenu">
      <SidebarContent>
        <slot name="side-menu" />
      </SidebarContent>
    </Sidebar>
    <SidebarInset class="min-w-0">
      <TopBar :with-side-menu="props.enableSideMenu" />
      <main class="flex-1 p-4 md:p-6">
        <PageBreadcrumb />
        <RouterView />
      </main>
      <PageFooter />
    </SidebarInset>
  </SidebarProvider>
</template>
