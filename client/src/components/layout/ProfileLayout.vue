<script setup lang="ts">
import { computed } from 'vue'
import SideMenu from '@/components/layout/SideMenu.vue'
import { sections } from '@/components/layout/sections'
import PageStructure from '@/components/PageStructure.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const menu = computed(() => [
  {
    label: 'menu.sections',
    items: sections
      .filter((section) => auth.hasRole(section.role))
      .map((section) => ({ label: section.label, to: section.path })),
  },
])
</script>

<template>
  <PageStructure>
    <template #side-menu>
      <SideMenu :items="menu" />
    </template>
  </PageStructure>
</template>
