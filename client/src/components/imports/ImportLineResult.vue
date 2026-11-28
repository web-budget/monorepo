<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImportLineView, ImportTarget } from '@/types'
import { isIncoming } from '@/utils/imports'
import { periodMonth } from '@/utils/invoices'

const props = defineProps<{ line: ImportLineView; target: ImportTarget; periodId: string }>()

const { t, d } = useI18n()

const key = computed(() => {
  const { action, link } = props.line
  const direction = isIncoming(props.line) ? 'income' : 'expense'
  switch (action) {
    case 'CREATE':
      return props.target === 'CARD' ? 'create-card' : `create-${direction}`
    case 'LINK':
      if (link?.kind === 'TRANSFER') {
        return 'link-transfer'
      }
      return props.target === 'CARD' ? 'link-card' : `link-${direction}`
    case 'LAUNCH_RECURRING':
      return 'launch-recurring'
    case 'CREATE_RECURRING':
      return 'create-recurring'
    case 'INVOICE_PAYMENT':
      return 'invoice-payment'
    case 'COMPARTMENT':
      return isIncoming(props.line) ? 'compartment-withdraw' : 'compartment-save'
    default:
      return 'transfer'
  }
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
const text = computed(() => {
  const period = props.line.link?.financialPeriod
  return t(`imports.saved.result.${key.value}`, {
    name: props.line.link?.name,
    other:
      period && period.id !== props.periodId
        ? t('imports.saved.result.of', { month: periodMonth(period.name) })
        : '',
    installment: props.line.installment,
    installments: props.line.installments,
    wallet: props.line.wallet?.name,
    compartment: props.line.compartment?.name ?? props.line.compartmentName,
  })
})
</script>

<template>
  <span :class="line.action === 'IGNORE' && 'text-muted-foreground'" data-slot="line-result">
    {{ line.action === 'IGNORE' ? ignored : text }}
  </span>
</template>
