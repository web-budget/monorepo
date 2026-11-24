<script setup lang="ts">
import { CloudOff, Plus, RotateCw, SearchX } from 'lucide-vue-next'
import { computed, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export type ListStateKind = 'empty' | 'no-result' | 'error'

export interface ListStateCopy {
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: string
  errorDescription?: string
  noResultQuery?: string
  noResultFilter?: string
  noResultHint?: string
  noResultAction?: string
}

const props = withDefaults(
  defineProps<{
    kind: ListStateKind
    entity: string
    icon: Component
    query?: string
    message?: string
    creatable?: boolean
    outlineAction?: boolean
    copy?: ListStateCopy
  }>(),
  { query: '', message: undefined, creatable: true, outlineAction: false, copy: () => ({}) },
)

const emit = defineEmits<{ create: []; clear: []; retry: [] }>()

const { t } = useI18n()

const texts = computed(() => {
  if (props.kind === 'empty') {
    return {
      title: props.copy.emptyTitle ?? t(`${props.entity}.list.empty-title`),
      description: props.copy.emptyDescription ?? t(`${props.entity}.list.empty-description`),
      action: props.copy.emptyAction ?? t('form.create'),
    }
  }
  if (props.kind === 'error') {
    return {
      title: t('crud.list.error.title', { plural: t(`${props.entity}.list.plural`) }),
      description: props.copy.errorDescription ?? props.message ?? t('crud.list.error.description'),
      action: t('crud.list.error.retry'),
    }
  }
  return {
    title: props.query
      ? (props.copy.noResultQuery ?? t('crud.list.no-result.title-query', { query: props.query }))
      : (props.copy.noResultFilter ?? t('crud.list.no-result.title-filter')),
    description: props.copy.noResultHint ?? t('crud.list.no-result.hint'),
    action:
      props.copy.noResultAction ??
      (props.query ? t('crud.list.no-result.clear') : t('crud.list.no-result.show-all')),
  }
})

function act() {
  if (props.kind === 'empty') {
    emit('create')
  } else if (props.kind === 'error') {
    emit('retry')
  } else {
    emit('clear')
  }
}
</script>

<template>
  <Card
    class="grid justify-items-center gap-2 px-6 py-14 text-center"
    :data-state="kind"
    :role="kind === 'error' ? 'alert' : 'status'"
  >
    <span
      :class="[
        'grid size-11 place-content-center rounded-md',
        kind === 'empty' && 'bg-accent text-accent-foreground',
        kind === 'error' && 'bg-expense-muted text-expense',
      ]"
    >
      <CloudOff v-if="kind === 'error'" class="size-5" />
      <SearchX v-else-if="kind === 'no-result'" class="text-muted-foreground size-6" />
      <component :is="icon" v-else class="size-5" />
    </span>
    <p :class="kind === 'empty' ? 'text-base font-semibold' : 'font-medium'">{{ texts.title }}</p>
    <p class="text-muted-foreground max-w-sm text-sm">{{ texts.description }}</p>
    <Button
      v-if="kind !== 'empty' || creatable"
      type="button"
      :variant="kind === 'empty' && !outlineAction ? 'default' : 'outline'"
      :size="kind === 'empty' && !outlineAction ? 'default' : 'sm'"
      class="mt-1"
      @click="act()"
    >
      <Plus v-if="kind === 'empty' && !outlineAction" />
      <RotateCw v-else-if="kind === 'error'" />
      {{ texts.action }}
    </Button>
  </Card>
</template>
