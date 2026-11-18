<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb.vue'
import TopBar from '@/components/layout/TopBar.vue'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { SIDEBAR_COOKIE_NAME } from '@/components/ui/sidebar/utils'

const props = withDefaults(defineProps<{ enableSideMenu?: boolean }>(), { enableSideMenu: true })

const route = useRoute()
const narrow = computed(() => route.meta.narrow === true)
const defaultOpen = !document.cookie.includes(`${SIDEBAR_COOKIE_NAME}=false`)
</script>

<template>
  <SidebarProvider :default-open="defaultOpen">
    <AppSidebar :enable-side-menu="props.enableSideMenu">
      <template #side-menu>
        <slot name="side-menu" />
      </template>
    </AppSidebar>
    <SidebarInset class="min-w-0">
      <TopBar :with-side-menu="props.enableSideMenu" />
      <div class="flex-1 px-4 py-4 md:px-8 md:py-6">
        <div :class="{ 'mx-auto max-w-[960px]': narrow }">
          <PageBreadcrumb />
          <RouterView />
        </div>
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
