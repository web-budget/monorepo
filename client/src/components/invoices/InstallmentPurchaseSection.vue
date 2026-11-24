<script setup lang="ts">
import { Info, ListChecks } from 'lucide-vue-next'
import { useFieldValue } from 'vee-validate'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const enabled = useFieldValue<boolean>('installmentPurchase')
</script>

<template>
  <FormSection
    :title="$t('card-purchase.sections.installments')"
    :description="$t('card-purchase.sections.installments-help')"
  >
    <StatusToggle
      name="installmentPurchase"
      :label="$t('card-purchase.form.installment')"
      heading=""
    />
    <template v-if="enabled">
      <InputField
        name="installments"
        type="number"
        :label="$t('card-purchase.form.installments')"
        mono
        required
      />
      <MoneyField
        name="installmentValue"
        :label="$t('card-purchase.form.installment-value')"
        required
      />
      <Alert class="md:col-span-2" data-slot="installment-notice">
        <Info />
        <AlertTitle>{{ $t('card-purchase.installment-notice.title') }}</AlertTitle>
        <AlertDescription class="flex flex-wrap items-center gap-3">
          {{ $t('card-purchase.installment-notice.description') }}
          <Button as-child size="sm" variant="outline">
            <RouterLink to="/financial/recurring-movements/launch">
              <ListChecks />{{ $t('card-purchase.installment-notice.action') }}
            </RouterLink>
          </Button>
        </AlertDescription>
      </Alert>
    </template>
  </FormSection>
</template>
