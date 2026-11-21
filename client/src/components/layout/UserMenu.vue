<script setup lang="ts">
import { ChevronDown, LogOut, MonitorSmartphone } from 'lucide-vue-next'
import LanguageSwitch from '@/components/layout/LanguageSwitch.vue'
import ThemeSwitch from '@/components/layout/ThemeSwitch.vue'
import UserAvatar from '@/components/layout/UserAvatar.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTrustedDevicesDialog } from '@/composables/useTrustedDevicesDialog'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const trustedDevicesDialog = useTrustedDevicesDialog()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" class="h-9 gap-2 px-1 md:pr-2" :aria-label="$t('layout.user-menu')">
        <UserAvatar :name="auth.session?.name" />
        <span class="font-medium max-md:hidden">{{ auth.session?.name }}</span>
        <ChevronDown class="max-md:hidden" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-72">
      <DropdownMenuLabel class="flex items-center gap-3 font-normal">
        <UserAvatar :name="auth.session?.name" class="size-9" />
        <div class="grid min-w-0">
          <span class="truncate font-medium">{{ auth.session?.name }}</span>
          <span class="text-muted-foreground truncate text-xs">{{ auth.session?.email }}</span>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuLabel class="text-muted-foreground text-xs font-medium">
        {{ $t('layout.theme') }}
      </DropdownMenuLabel>
      <div class="px-1 pb-1.5">
        <ThemeSwitch in-menu />
      </div>
      <DropdownMenuLabel class="text-muted-foreground text-xs font-medium">
        {{ $t('layout.language') }}
      </DropdownMenuLabel>
      <div class="px-1 pb-1.5">
        <LanguageSwitch in-menu />
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem @select="trustedDevicesDialog.show()">
        <MonitorSmartphone />
        {{ $t('layout.trusted-devices') }}
      </DropdownMenuItem>
      <DropdownMenuItem @select="auth.logout()">
        <LogOut />
        {{ $t('layout.logout') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
