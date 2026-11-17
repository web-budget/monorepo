<script setup lang="ts">
import { LogOut, Moon, Sun, User } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useAppearanceStore } from '@/stores/appearance'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types'

const props = defineProps<{ withSideMenu: boolean }>()

const sections: { path: string; label: string; role: Role }[] = [
  { path: '/registration', label: 'menu.registration', role: 'REGISTRATION' },
  { path: '/financial', label: 'menu.financial', role: 'FINANCIAL' },
  { path: '/configuration', label: 'menu.configuration', role: 'ADMINISTRATION' },
]

const route = useRoute()
const auth = useAuthStore()
const appearance = useAppearanceStore()

const visibleSections = computed(() => sections.filter(({ role }) => auth.hasRole(role)))
const currentSection = computed(() =>
  visibleSections.value.find(({ path }) => route.path.startsWith(path)),
)
</script>

<template>
  <header class="bg-background sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4">
    <template v-if="props.withSideMenu">
      <SidebarTrigger :aria-label="$t('layout.toggle-menu')" />
      <Separator orientation="vertical" class="mr-2 h-4" />
    </template>

    <RouterLink to="/" class="text-lg">
      <span class="font-light">web</span><span class="font-bold">Budget</span>
    </RouterLink>

    <nav :aria-label="$t('layout.main-menu')" class="ml-6 hidden items-center gap-1 md:flex">
      <Button
        v-for="section in visibleSections"
        :key="section.path"
        as-child
        :variant="currentSection?.path === section.path ? 'secondary' : 'ghost'"
        size="sm"
      >
        <RouterLink :to="section.path">{{ $t(section.label) }}</RouterLink>
      </Button>
    </nav>

    <div class="ml-auto">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="sm" :aria-label="$t('layout.user-menu')">
            <User />
            <span class="hidden sm:inline">{{ auth.session?.name }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel class="font-normal">
            <p class="text-sm font-medium">{{ auth.session?.name }}</p>
            <p class="text-muted-foreground text-xs">{{ auth.session?.email }}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            v-for="section in visibleSections"
            :key="section.path"
            class="md:hidden"
            as-child
          >
            <RouterLink :to="section.path">{{ $t(section.label) }}</RouterLink>
          </DropdownMenuItem>
          <DropdownMenuSeparator v-if="visibleSections.length > 0" class="md:hidden" />
          <DropdownMenuItem @select="appearance.toggleDark()">
            <Sun v-if="appearance.dark" />
            <Moon v-else />
            {{ appearance.dark ? $t('layout.light-theme') : $t('layout.dark-theme') }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select="auth.logout()">
            <LogOut />
            {{ $t('layout.logout') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>
