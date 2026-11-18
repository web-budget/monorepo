<script setup lang="ts">
import SideMenu from '@/components/layout/SideMenu.vue'
import { configurationSection } from '@/components/layout/sections'
import PageStructure from '@/components/PageStructure.vue'
</script>

<template>
  <PageStructure>
    <template #side-menu>
      <SideMenu :items="[configurationSection]" />
    </template>
  </PageStructure>
</template>
