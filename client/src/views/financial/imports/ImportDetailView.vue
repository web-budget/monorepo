<script setup lang="ts">
import { CircleAlert, FileUp, LoaderCircle } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ImportDestination from '@/components/imports/ImportDestination.vue'
import ImportInfo from '@/components/imports/ImportInfo.vue'
import ImportStatusBadge from '@/components/imports/ImportStatusBadge.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useImportPolling } from '@/composables/useImportPolling'
import { useImportsStore } from '@/stores/imports'
import { destinationName, importErrorCode, retryQuery } from '@/utils/imports'
import ImportSavedView from '@/views/financial/imports/ImportSavedView.vue'

const props = defineProps<{ id: string }>()

const router = useRouter()
const { current } = storeToRefs(useImportsStore())
const { messages } = useImportPolling(() => props.id)

const item = computed(() => (current.value?.id === props.id ? current.value : null))
const errorCode = computed(() => importErrorCode(item.value!.error))
const saved = computed(() => item.value?.status === 'SAVED' || item.value?.status === 'UNDONE')

watch(
  () => item.value?.status,
  (status) => {
    if (status === 'READY') {
      void router.replace({ name: 'imports.draft', params: { id: props.id } })
    }
  },
  { immediate: true },
)

function retry() {
  return router.push({ name: 'imports.create', query: retryQuery(item.value!) })
}
</script>

<template>
  <PageContainer>
    <ServerErrorAlert :messages="messages" />
    <template v-if="item">
      <ImportSavedView v-if="saved" :item="item" />
      <template v-else>
        <PageHeader :title="item.fileName">
          <template #badge><ImportStatusBadge :status="item.status" /></template>
        </PageHeader>
        <p class="text-muted-foreground -mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <ImportDestination :source="item" />· {{ item.financialPeriod.name }}
        </p>
        <Card
          v-if="item.status === 'PROCESSING'"
          class="grid gap-4 p-5"
          role="status"
          data-slot="processing"
        >
          <div class="flex items-center gap-3">
            <LoaderCircle class="text-muted-foreground size-5 animate-spin" />
            <span class="font-medium">{{ $t('imports.detail.processing') }}</span>
          </div>
          <div class="grid gap-2">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
            <Skeleton class="h-4 w-2/3" />
          </div>
        </Card>
        <template v-else-if="item.status === 'FAILED'">
          <Alert variant="destructive" data-slot="import-error">
            <CircleAlert />
            <AlertTitle>{{
              $t(`imports.errors.${errorCode}.title`, {
                period: item.financialPeriod.name,
                card: destinationName(item),
              })
            }}</AlertTitle>
            <AlertDescription class="text-foreground">
              {{ $t(`imports.errors.${errorCode}.text`) }}
              <div class="mt-1.5">
                <Button type="button" variant="outline" size="sm" @click="retry()">
                  <FileUp />{{ $t('imports.detail.retry') }}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          <Card class="gap-0 py-0"><ImportInfo :item="item" /></Card>
        </template>
      </template>
    </template>
  </PageContainer>
</template>
