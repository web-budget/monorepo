<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ $t('pages.quick-access') }}</CardTitle>
    </CardHeader>
    <CardContent>
      <p class="text-muted-foreground">{{ $t('menu.configuration') }}</p>
    </CardContent>
  </Card>
</template>
