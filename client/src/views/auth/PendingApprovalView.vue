<script setup lang="ts">
import { ArrowLeft, Hourglass, Info, MailCheck } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AuthStatusIcon from '@/components/auth/AuthStatusIcon.vue'
import AuthStepHeader from '@/components/auth/AuthStepHeader.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = computed(() => auth.session?.email ?? auth.registeredEmail)

function backToLogin() {
  return auth.isAuthenticated ? auth.logout() : router.push({ name: 'login' })
}
</script>

<template>
  <div class="grid gap-6">
    <AuthStatusIcon :icon="Hourglass" tone="attention" />
    <AuthStepHeader :title="$t('pending-approval.title')">
      <i18n-t v-if="email" keypath="pending-approval.description" scope="global">
        <template #email>
          <span class="text-foreground font-medium">{{ email }}</span>
        </template>
      </i18n-t>
      <template v-else>{{ $t('pending-approval.description-anonymous') }}</template>
    </AuthStepHeader>
    <Alert v-if="auth.registeredEmail" data-slot="activation-hint">
      <MailCheck />
      <AlertTitle>{{ $t('pending-approval.activation.title') }}</AlertTitle>
      <AlertDescription>{{ $t('pending-approval.activation.description') }}</AlertDescription>
    </Alert>
    <Alert>
      <Info />
      <AlertTitle>{{ $t('pending-approval.waiting.title') }}</AlertTitle>
      <AlertDescription>{{ $t('pending-approval.waiting.description') }}</AlertDescription>
    </Alert>
    <Button type="button" variant="outline" size="lg" class="w-full" @click="backToLogin">
      <ArrowLeft />
      {{ $t('auth-step.back-to-login') }}
    </Button>
  </div>
</template>
