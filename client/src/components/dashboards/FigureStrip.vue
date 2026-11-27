<script setup lang="ts">
export interface Figure {
  key: string
  label: string
  note?: string
}

const GRIDS: Record<number, string> = {
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-6 lg:grid-cols-5',
}

const CELLS: Record<number, string[]> = {
  3: ['', '', 'col-span-2 md:col-span-1'],
  4: ['', '', '', ''],
  5: [
    'md:col-span-2 lg:col-span-1',
    'md:col-span-2 lg:col-span-1',
    'md:col-span-2 lg:col-span-1',
    'md:col-span-3 lg:col-span-1',
    'col-span-2 md:col-span-3 lg:col-span-1',
  ],
}

defineProps<{ figures: Figure[] }>()
</script>

<template>
  <div
    :class="['bg-border grid gap-px', GRIDS[figures.length]]"
    data-slot="figure-strip"
    role="list"
  >
    <div
      v-for="(figure, index) in figures"
      :key="figure.key"
      :class="['bg-card grid content-start gap-1 px-5 py-4', CELLS[figures.length]![index]]"
      :data-figure="figure.key"
      role="listitem"
    >
      <span class="text-muted-foreground text-xs">{{ figure.label }}</span>
      <span class="text-base font-semibold tracking-tight whitespace-nowrap md:text-2xl">
        <slot :name="`value-${figure.key}`" />
      </span>
      <span v-if="figure.note" class="text-muted-foreground text-xs">{{ figure.note }}</span>
    </div>
  </div>
</template>
