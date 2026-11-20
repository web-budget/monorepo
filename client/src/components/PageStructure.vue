<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'
import TopBar from '@/components/layout/TopBar.vue'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { SIDEBAR_COOKIE_NAME } from '@/components/ui/sidebar/utils'

const defaultOpen = !document.cookie.includes(`${SIDEBAR_COOKIE_NAME}=false`)
</script>

<template>
  <SidebarProvider :default-open="defaultOpen">
    <AppSidebar>
      <template #side-menu>
        <slot name="side-menu" />
      </template>
    </AppSidebar>
    <SidebarInset class="min-w-0">
      <TopBar />
      <div class="flex-1 px-4 py-4 md:px-8 md:py-6">
        <PageBreadcrumb />
        <RouterView />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
