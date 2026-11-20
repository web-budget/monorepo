<script setup lang="ts">
import { ChartColumn } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import { Card } from '@/components/ui/card'

defineProps<{ title: string; description: string }>()
</script>

<template>
  <PageHeader :title="$t(title)" :description="$t(description)" />
  <Card class="mt-6 grid justify-items-center gap-2 px-6 py-14 text-center" role="status">
    <span class="bg-accent text-accent-foreground grid size-11 place-content-center rounded-md">
      <ChartColumn class="size-5" />
    </span>
    <p class="text-base font-semibold">{{ $t('dashboards.empty.title') }}</p>
    <p class="text-muted-foreground max-w-sm text-sm">{{ $t('dashboards.empty.description') }}</p>
  </Card>
</template>
