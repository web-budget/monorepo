<script setup lang="ts">
import ModuleHome from '@/components/layout/ModuleHome.vue'
import { financialSection } from '@/components/layout/sections'
</script>

<template>
  <ModuleHome
    :section="financialSection"
    description="module-home.description.financial"
    :counts="{}"
  />
</template>
