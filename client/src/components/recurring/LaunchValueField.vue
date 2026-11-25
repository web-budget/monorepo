<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import MoneyField from '@/components/forms/MoneyField.vue'

const props = defineProps<{ suggestedValue: number }>()

const { n } = useI18n()

const placeholder = computed(() => n(props.suggestedValue, 'currency').replace(/^R\$\s*/, ''))
</script>

<template>
  <MoneyField
    name="value"
    :label="$t('recurrent-movement.launch-extra.value')"
    :placeholder="placeholder"
    :hint="
      $t('recurrent-movement.launch-extra.value-hint', {
        value: $n(suggestedValue, 'currency'),
      })
    "
  />
</template>
