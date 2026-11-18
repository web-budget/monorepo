<script setup lang="ts">
import SideMenu from '@/components/layout/SideMenu.vue'
import { financialSection } from '@/components/layout/sections'
import PageStructure from '@/components/PageStructure.vue'
</script>

<template>
  <PageStructure>
    <template #side-menu>
      <SideMenu :items="[financialSection]" />
    </template>
  </PageStructure>
</template>
