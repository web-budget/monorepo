<script setup lang="ts">
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { Toaster } from '@/components/ui/sonner'
import { useInactivityLogout } from '@/composables/useInactivityLogout'

useInactivityLogout()
</script>

<template>
  <RouterView />
  <Toaster position="top-center" />
  <ConfirmDialog />
</template>
