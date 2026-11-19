<script setup lang="ts">
import { CircleCheck, Link2Off, Loader2 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AuthStatusIcon from '@/components/auth/AuthStatusIcon.vue'
import AuthStepHeader from '@/components/auth/AuthStepHeader.vue'
import BackToLogin from '@/components/auth/BackToLogin.vue'
import { Button } from '@/components/ui/button'
import { useAccountStore } from '@/stores/account'
import { queryValue } from '@/utils/queryValue'

type ActivationStatus = 'activating' | 'success' | 'error'

const route = useRoute()
const account = useAccountStore()

const email = queryValue(route.query.email)
const status = ref<ActivationStatus>('activating')

onMounted(async () => {
  try {
    await account.activate({ token: queryValue(route.query.token), email })
    status.value = 'success'
  } catch {
    status.value = 'error'
  }
})
</script>

<template>
  <p
    v-if="status === 'activating'"
    role="status"
    class="text-muted-foreground flex items-center gap-2"
  >
    <Loader2 class="animate-spin" />
    {{ $t('account-activation.activating') }}
  </p>
  <div v-else-if="status === 'success'" class="grid gap-6">
    <AuthStatusIcon :icon="CircleCheck" tone="success" />
    <AuthStepHeader :title="$t('account-activation.success.title')">
      <i18n-t keypath="account-activation.success.description" scope="global">
        <template #email>
          <span class="text-foreground font-medium">{{ email }}</span>
        </template>
      </i18n-t>
    </AuthStepHeader>
    <Button size="lg" class="w-full" as-child>
      <RouterLink :to="{ name: 'login' }">{{ $t('account-activation.success.action') }}</RouterLink>
    </Button>
  </div>
  <div v-else class="grid gap-6">
    <AuthStatusIcon :icon="Link2Off" tone="danger" />
    <AuthStepHeader :title="$t('account-activation.error.title')">
      {{ $t('account-activation.error.description') }}
    </AuthStepHeader>
    <BackToLogin button />
  </div>
</template>
