<script setup lang="ts">
import { Menu, PanelLeft } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BrandMark from '@/components/brand/BrandMark.vue'
import BrandWordmark from '@/components/brand/BrandWordmark.vue'
import UserMenu from '@/components/layout/UserMenu.vue'
import { sections } from '@/components/layout/sections'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSidebar } from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ withSideMenu: boolean }>()

const route = useRoute()
const auth = useAuthStore()
const { toggleSidebar } = useSidebar()

const visibleSections = computed(() => sections.filter(({ role }) => auth.hasRole(role)))
const currentSection = computed(() =>
  visibleSections.value.find(({ path }) => route.path.startsWith(path)),
)
</script>

<template>
  <header
    class="bg-background sticky top-0 z-30 flex h-14 shrink-0 items-stretch gap-1 border-b px-3"
  >
    <div class="flex items-center">
      <Button
        variant="ghost"
        size="icon"
        :class="{ 'md:hidden': !props.withSideMenu }"
        :aria-label="$t('layout.toggle-menu')"
        @click="toggleSidebar"
      >
        <PanelLeft class="max-md:hidden" />
        <Menu class="md:hidden" />
      </Button>
      <Separator v-if="props.withSideMenu" orientation="vertical" class="mx-2 h-5 max-md:hidden" />
    </div>

    <RouterLink
      to="/"
      class="flex items-center gap-2.5 text-base"
      :class="{ 'md:hidden': props.withSideMenu }"
    >
      <BrandMark :size="24" />
      <BrandWordmark class="max-md:hidden" />
    </RouterLink>
    <span v-if="currentSection" class="flex items-center font-medium md:hidden">
      {{ $t(currentSection.label) }}
    </span>

    <nav :aria-label="$t('layout.main-menu')" class="flex items-stretch gap-1 max-md:hidden">
      <RouterLink
        v-for="section in visibleSections"
        :key="section.path"
        :to="section.path"
        aria-current-value="true"
        :aria-current="currentSection?.path === section.path ? 'true' : undefined"
        class="text-muted-foreground hover:text-foreground aria-[current=true]:text-foreground aria-[current=true]:border-primary -mb-px inline-flex items-center border-b-2 border-transparent px-3 text-sm aria-[current=true]:font-semibold"
      >
        {{ $t(section.label) }}
      </RouterLink>
    </nav>

    <div class="ml-auto flex items-center">
      <UserMenu />
    </div>
  </header>
</template>
