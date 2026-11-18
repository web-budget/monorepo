<script setup lang="ts">
import SideMenu from '@/components/layout/SideMenu.vue'
import { dashboardsSection } from '@/components/layout/sections'
import PageStructure from '@/components/PageStructure.vue'
</script>

<template>
  <PageStructure>
    <template #side-menu>
      <SideMenu :items="[dashboardsSection]" />
    </template>
  </PageStructure>
</template>
