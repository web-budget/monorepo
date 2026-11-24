<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import type { ModuleSectionDefinition } from '@/components/layout/sections'
import { Badge } from '@/components/ui/badge'

const props = withDefaults(
  defineProps<{
    section: ModuleSectionDefinition
    description: string
    counts: Record<string, number | string | null>
    attentions?: Record<string, string | null>
  }>(),
  { attentions: () => ({}) },
)

function countOf(destination: string): number | string | null {
  return props.counts[destination] ?? null
}

function attentionOf(destination: string): string | null {
  return props.attentions[destination] ?? null
}
</script>

<template>
  <PageHeader :title="$t(section.label)" :description="$t(description)" />
  <div class="mt-11 grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-4">
    <template v-for="item in section.items" :key="item.label">
      <RouterLink
        v-if="item.to"
        :to="item.to"
        data-slot="module-card"
        class="bg-card text-card-foreground hover:bg-accent/40 flex items-start gap-4 rounded-lg border p-5"
      >
        <span class="bg-accent text-accent-foreground grid size-10 place-content-center rounded-md">
          <component :is="item.icon" class="size-5" />
        </span>
        <span class="grid min-w-0 flex-1 gap-1">
          <span class="flex flex-wrap items-center gap-2 text-base font-semibold">
            {{ $t(item.label) }}
            <Badge
              v-if="attentionOf(item.to)"
              variant="highlight"
              data-slot="module-card-attention"
            >
              {{ attentionOf(item.to) }}
            </Badge>
          </span>
          <span class="text-muted-foreground text-sm">{{ $t(item.description) }}</span>
        </span>
        <span
          v-if="countOf(item.to) !== null"
          class="text-muted-foreground font-mono text-sm tabular-nums"
          data-slot="module-card-count"
        >
          {{ countOf(item.to) }}
        </span>
        <ChevronRight v-else class="text-muted-foreground" />
      </RouterLink>
      <div
        v-else
        aria-disabled="true"
        data-slot="module-card"
        class="bg-card text-card-foreground flex items-start gap-4 rounded-lg border p-5 opacity-60"
      >
        <span class="bg-accent text-accent-foreground grid size-10 place-content-center rounded-md">
          <component :is="item.icon" class="size-5" />
        </span>
        <span class="grid min-w-0 flex-1 gap-1">
          <span class="flex flex-wrap items-center gap-2 text-base font-semibold">
            {{ $t(item.label) }}
            <Badge variant="neutral">{{ $t('layout.coming-soon') }}</Badge>
          </span>
          <span class="text-muted-foreground text-sm">{{ $t(item.description) }}</span>
        </span>
      </div>
    </template>
  </div>
</template>
