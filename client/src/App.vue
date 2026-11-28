<script setup lang="ts">
import AccountDialog from '@/components/account/AccountDialog.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SessionLoading from '@/components/common/SessionLoading.vue'
import { Toaster } from '@/components/ui/sonner'
import { useInactivityLogout } from '@/composables/useInactivityLogout'
import { useAuthStore } from '@/stores/auth'

useInactivityLogout()
const auth = useAuthStore()
</script>

<template>
  <RouterView />
  <SessionLoading v-if="auth.restoringSession" />
  <Toaster position="top-center" />
  <ConfirmDialog />
  <AccountDialog />
</template>
