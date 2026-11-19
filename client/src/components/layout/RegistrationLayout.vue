<script setup lang="ts">
import SideMenu from '@/components/layout/SideMenu.vue'
import { registrationSection } from '@/components/layout/sections'
import PageStructure from '@/components/PageStructure.vue'
</script>

<template>
  <PageStructure>
    <template #side-menu>
      <SideMenu :items="[registrationSection]" />
    </template>
  </PageStructure>
</template>
