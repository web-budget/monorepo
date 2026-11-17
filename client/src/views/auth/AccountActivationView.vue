<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { useAccountStore } from '@/stores/account'
import { queryValue } from '@/utils/queryValue'

type ActivationStatus = 'activating' | 'success' | 'error'

const route = useRoute()
const account = useAccountStore()

const status = ref<ActivationStatus>('activating')

onMounted(async () => {
  try {
    await account.activate({
      token: queryValue(route.query.token),
      email: queryValue(route.query.email),
    })
    status.value = 'success'
  } catch {
    status.value = 'error'
  }
})
</script>

<template>
  <div class="grid gap-6 text-center">
    <p
      role="status"
      class="font-medium"
      :class="status === 'error' ? 'text-destructive' : 'text-muted-foreground'"
    >
      {{ $t(`account-activation.${status}`) }}
    </p>
    <Button variant="link" as-child>
      <RouterLink :to="{ name: 'login' }">{{ $t('account-activation.back-to-login') }}</RouterLink>
    </Button>
  </div>
</template>
