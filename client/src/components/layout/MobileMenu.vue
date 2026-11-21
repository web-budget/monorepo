<script setup lang="ts">
import { LogOut, MonitorSmartphone, X } from 'lucide-vue-next'
import { computed } from 'vue'
import BrandMark from '@/components/brand/BrandMark.vue'
import BrandWordmark from '@/components/brand/BrandWordmark.vue'
import SideMenu from '@/components/layout/SideMenu.vue'
import LanguageSwitch from '@/components/layout/LanguageSwitch.vue'
import ThemeSwitch from '@/components/layout/ThemeSwitch.vue'
import UserAvatar from '@/components/layout/UserAvatar.vue'
import { sections } from '@/components/layout/sections'
import { Button } from '@/components/ui/button'
import { SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from '@/components/ui/sidebar'
import { useTrustedDevicesDialog } from '@/composables/useTrustedDevicesDialog'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { setOpenMobile } = useSidebar()

const trustedDevicesDialog = useTrustedDevicesDialog()

const visibleSections = computed(() => sections.filter(({ role }) => auth.hasRole(role)))

function openTrustedDevices() {
  setOpenMobile(false)
  trustedDevicesDialog.show()
}
</script>

<template>
  <SidebarHeader
    class="border-sidebar-border h-14 shrink-0 flex-row items-center gap-2.5 border-b px-4"
  >
    <RouterLink to="/" class="flex items-center gap-2.5 text-base" @click="setOpenMobile(false)">
      <BrandMark :size="24" />
      <BrandWordmark />
    </RouterLink>
    <Button
      variant="ghost"
      size="icon-sm"
      class="ml-auto"
      :aria-label="$t('layout.close-menu')"
      @click="setOpenMobile(false)"
    >
      <X />
    </Button>
  </SidebarHeader>
  <SidebarContent>
    <SideMenu :items="visibleSections" />
  </SidebarContent>
  <SidebarFooter class="border-sidebar-border gap-3 border-t p-3">
    <div class="flex items-center gap-2.5">
      <UserAvatar :name="auth.session?.name" />
      <div class="grid min-w-0 flex-1">
        <span class="truncate text-sm font-medium">{{ auth.session?.name }}</span>
        <span class="text-muted-foreground truncate text-xs">{{ auth.session?.email }}</span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        :aria-label="$t('layout.logout')"
        @click="auth.logout()"
      >
        <LogOut />
      </Button>
    </div>
    <LanguageSwitch />
    <div class="flex items-center gap-2">
      <ThemeSwitch icon-only class="flex-1" />
      <Button
        variant="outline"
        size="icon"
        :aria-label="$t('layout.trusted-devices')"
        @click="openTrustedDevices"
      >
        <MonitorSmartphone />
      </Button>
    </div>
  </SidebarFooter>
</template>
