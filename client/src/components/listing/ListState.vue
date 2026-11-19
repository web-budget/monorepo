<script setup lang="ts">
import { CloudOff, Plus, RotateCw, SearchX } from 'lucide-vue-next'
import { computed, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export type ListStateKind = 'empty' | 'no-result' | 'error'

const props = withDefaults(
  defineProps<{
    kind: ListStateKind
    entity: string
    icon: Component
    query?: string
    message?: string
  }>(),
  { query: '', message: undefined },
)

const emit = defineEmits<{ create: []; clear: []; retry: [] }>()

const { t } = useI18n()

const texts = computed(() => {
  if (props.kind === 'empty') {
    return {
      title: t(`${props.entity}.list.empty-title`),
      description: t(`${props.entity}.list.empty-description`),
      action: t(`${props.entity}.form.new`),
    }
  }
  if (props.kind === 'error') {
    return {
      title: t('crud.list.error.title', { plural: t(`${props.entity}.list.plural`) }),
      description: props.message ?? t('crud.list.error.description'),
      action: t('crud.list.error.retry'),
    }
  }
  return {
    title: props.query
      ? t('crud.list.no-result.title-query', { query: props.query })
      : t('crud.list.no-result.title-filter'),
    description: t('crud.list.no-result.hint'),
    action: props.query ? t('crud.list.no-result.clear') : t('crud.list.no-result.show-all'),
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
      type="button"
      :variant="kind === 'empty' ? 'default' : 'outline'"
      :size="kind === 'empty' ? 'default' : 'sm'"
      class="mt-1"
      @click="act()"
    >
      <Plus v-if="kind === 'empty'" />
      <RotateCw v-else-if="kind === 'error'" />
      {{ texts.action }}
    </Button>
  </Card>
</template>
