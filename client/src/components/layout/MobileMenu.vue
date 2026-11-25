<script setup lang="ts">
import { LogOut, UserRound, X } from 'lucide-vue-next'
import { computed } from 'vue'
import BrandMark from '@/components/brand/BrandMark.vue'
import BrandWordmark from '@/components/brand/BrandWordmark.vue'
import SideMenu from '@/components/layout/SideMenu.vue'
import ThemeSwitch from '@/components/layout/ThemeSwitch.vue'
import UserAvatar from '@/components/layout/UserAvatar.vue'
import { sections } from '@/components/layout/sections'
import { Button } from '@/components/ui/button'
import { SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from '@/components/ui/sidebar'
import { useAccountDialog } from '@/composables/useAccountDialog'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { setOpenMobile } = useSidebar()

const accountDialog = useAccountDialog()

const visibleSections = computed(() => sections.filter(({ role }) => auth.hasRole(role)))

function openAccount() {
  setOpenMobile(false)
  accountDialog.show()
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
    <SideMenu :items="visibleSections" flat />
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
    <Button variant="outline" class="w-full justify-start" @click="openAccount">
      <UserRound />
      {{ $t('layout.account') }}
    </Button>
    <ThemeSwitch icon-only />
  </SidebarFooter>
</template>
