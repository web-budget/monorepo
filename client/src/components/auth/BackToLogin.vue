<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

defineProps<{ button?: boolean }>()
</script>

<template>
  <Button v-if="button" variant="outline" size="lg" class="w-full" as-child>
    <RouterLink :to="{ name: 'login' }">
      <ArrowLeft />
      {{ $t('auth-step.back-to-login') }}
    </RouterLink>
  </Button>
  <RouterLink
    v-else
    :to="{ name: 'login' }"
    class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 justify-self-center"
  >
    <ArrowLeft class="size-4" />
    {{ $t('auth-step.back-to-login') }}
  </RouterLink>
</template>
