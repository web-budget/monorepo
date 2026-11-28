<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
import { computed, provide } from 'vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SERVER_FIELDS_INJECTION_KEY } from '@/components/ui/form'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    loading: boolean
    submitting?: boolean
    dirty?: boolean
    readonly?: boolean
    messages: string[]
    fields?: string[]
    submitLabel: string
    wideAside?: boolean
  }>(),
  {
    wideAside: false,
    description: undefined,
    submitting: false,
    dirty: false,
    readonly: false,
    fields: () => [],
  },
)

const emit = defineEmits<{ submit: []; back: [] }>()

provide(
  SERVER_FIELDS_INJECTION_KEY,
  computed(() => props.fields),
)
</script>

<template>
  <PageContainer>
    <PageHeader :title="title" :description="description ?? $t('crud.required-hint')">
      <template v-if="$slots.badge" #badge><slot name="badge" /></template>
    </PageHeader>
    <ServerErrorAlert :messages="messages" />
    <slot name="before" />
    <div
      :class="
        $slots.aside &&
        (wideAside
          ? 'grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]'
          : 'grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_280px]')
      "
    >
      <form novalidate @submit.prevent="emit('submit')">
        <Card class="gap-0 py-0">
          <fieldset :disabled="loading || submitting || readonly" class="min-w-0">
            <slot />
          </fieldset>
          <div
            class="bg-muted sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-b-lg px-5 py-3"
          >
            <span class="text-muted-foreground text-xs max-md:hidden">
              <template v-if="dirty">{{ $t('crud.unsaved') }}</template>
              <slot v-else name="saved" />
            </span>
            <div class="flex gap-2 max-md:w-full">
              <Button
                type="button"
                variant="outline"
                class="max-md:flex-1"
                :disabled="submitting || readonly"
                @mousedown.prevent
                @click="emit('back')"
              >
                {{ $t('form.cancel') }}
              </Button>
              <Button
                type="submit"
                class="max-md:flex-1"
                :disabled="loading || submitting || readonly"
                :aria-busy="submitting"
              >
                <template v-if="submitting">
                  <LoaderCircle class="animate-spin" />{{ $t('crud.saving') }}
                </template>
                <template v-else>{{ submitLabel }}</template>
              </Button>
            </div>
          </div>
        </Card>
      </form>
      <slot name="aside" />
    </div>
  </PageContainer>
</template>
