<script setup lang="ts">
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import ImportDestination from '@/components/imports/ImportDestination.vue'
import type { ImportView } from '@/types'

defineProps<{ item: ImportView }>()
</script>

<template>
  <DetailSection :title="$t('imports.detail.section')" columns="md:grid-cols-4">
    <DetailField :label="$t('imports.detail.file')">
      <span class="[overflow-wrap:anywhere]">{{ item.fileName }}</span>
    </DetailField>
    <DetailField :label="$t('imports.columns.destination')">
      <ImportDestination :source="item" />
    </DetailField>
    <DetailField :label="$t('imports.columns.period')">{{ item.financialPeriod.name }}</DetailField>
    <DetailField :label="$t('imports.columns.sent-on')">
      <DateTimeDisplay with-time :value="item.createdOn" class="font-mono tabular-nums" />
    </DetailField>
  </DetailSection>
</template>
