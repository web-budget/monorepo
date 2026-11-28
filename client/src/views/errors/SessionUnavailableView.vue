<script setup lang="ts">
import { CloudOff } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import ErrorPage from '@/components/ErrorPage.vue'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { queryValue } from '@/utils/queryValue'
import { safeRedirect } from '@/utils/safeRedirect'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

async function retry() {
  const redirect = safeRedirect(queryValue(route.query.redirect))
  if (await auth.restoreSession()) {
    await router.replace(redirect ?? { name: 'start' })
  } else if (!auth.sessionUnavailable) {
    await router.replace({ name: 'login', query: redirect ? { redirect } : {} })
  }
}
</script>

<template>
  <ErrorPage>
    <template #error-title><CloudOff class="size-8" aria-hidden="true" /></template>
    <template #error-detail>{{ $t('error.connection-failure.title') }}</template>
    <template #error-description>{{ $t('error.connection-failure.details') }}</template>
    <template #action>
      <Button @click="retry">{{ $t('action-button.try-again') }}</Button>
    </template>
  </ErrorPage>
</template>
