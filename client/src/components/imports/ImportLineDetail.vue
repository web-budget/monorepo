<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import type { ImportLineView } from '@/types'
import { missingKey } from '@/utils/imports'
import { periodMonth } from '@/utils/invoices'

const props = defineProps<{ line: ImportLineView; periodId: string }>()

const { t, d } = useI18n()

const missing = computed(() =>
  props.line.pending
    .map((reason) => t(`imports.draft.reasons.${missingKey(props.line, reason)}`))
    .join(t('imports.draft.and')),
)
const other = computed(() => {
  const period = props.line.link?.financialPeriod
  return period && period.id !== props.periodId ? periodMonth(period.name) : null
})
const ignored = computed(() => {
  const reason = props.line.ignoreReason
  if (!reason) {
    return t('imports.draft.ignored.user')
  }
  return t(`imports.draft.ignored.${reason.code}`, {
    date: reason.date ? d(`${reason.date}T00:00:00`, 'short') : '',
  })
})
</script>

<template>
  <Badge v-if="line.pending.length > 0" variant="pending" data-slot="line-missing">
    {{ $t('imports.draft.missing', { what: missing }) }}
  </Badge>
  <template v-else-if="line.action === 'CREATE'">
    {{ line.costCenter?.name }} · {{ line.classification?.name }}
  </template>
  <template v-else-if="line.action === 'CREATE_RECURRING'">
    <span class="font-mono tabular-nums">{{ line.installment }}/{{ line.installments }}</span>
    · {{ line.costCenter?.name }} · {{ line.classification?.name }}
  </template>
  <template v-else-if="line.action === 'TRANSFER'">
    {{ $t('imports.draft.transfer-to', { wallet: line.wallet?.name }) }}
  </template>
  <template v-else-if="line.action === 'IGNORE'">
    <span class="text-muted-foreground">{{ ignored }}</span>
  </template>
  <template v-else>
    {{ line.link?.name }}
    <span v-if="other" class="text-muted-foreground">· {{ other }}</span>
  </template>
</template>
