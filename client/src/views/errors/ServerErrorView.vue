<script setup lang="ts">
import ErrorPage from '@/components/ErrorPage.vue'
import { Button } from '@/components/ui/button'
</script>

<template>
  <ErrorPage>
    <template #error-title>500</template>
    <template #error-detail>{{ $t('error.server-error.detail') }}</template>
    <template #error-description>{{ $t('error.server-error.description') }}</template>
    <template #action>
      <Button as-child>
        <RouterLink :to="{ name: 'home' }">{{ $t('action-button.go-home') }}</RouterLink>
      </Button>
    </template>
  </ErrorPage>
</template>
