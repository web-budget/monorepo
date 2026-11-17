<script setup lang="ts">
import { ArrowRightLeft, Users } from 'lucide-vue-next'
import SideMenu from '@/components/layout/SideMenu.vue'
import type { MenuGroup } from '@/components/layout/menu'
import PageStructure from '@/components/PageStructure.vue'

const items: MenuGroup[] = [
  {
    label: 'menu.configuration',
    items: [
      { label: 'users.menu', icon: Users },
      { label: 'integrations.menu', icon: ArrowRightLeft },
    ],
  },
]
</script>

<template>
  <PageStructure>
    <template #side-menu>
      <SideMenu :items="items" />
    </template>
  </PageStructure>
</template>
