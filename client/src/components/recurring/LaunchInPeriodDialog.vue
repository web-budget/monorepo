<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import InputField from '@/components/forms/InputField.vue'
import LaunchValueField from '@/components/recurring/LaunchValueField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  launchInPeriodFormSchema,
  toRecurringExtraLaunchForm,
  type LaunchInPeriodFormValues,
} from '@/schemas/recurringMovementSchema'
import type {
  FinancialPeriodListView,
  RecurringExtraLaunchForm,
  RecurringMovementView,
} from '@/types'
import { nextOpenPeriod } from '@/utils/movements'
import { extraLaunchInstallments, maxExtraLaunches } from '@/utils/recurringMovements'

const props = defineProps<{
  recurringMovement: RecurringMovementView | null
  periods: FinancialPeriodListView[]
  loading: boolean
  messages: string[]
}>()

const emit = defineEmits<{
  close: []
  confirm: [recurringMovement: RecurringMovementView, form: RecurringExtraLaunchForm]
}>()

const { t, d } = useI18n()

const maximum = computed(() =>
  props.recurringMovement ? maxExtraLaunches(props.recurringMovement) : 1,
)
const variable = computed(() => props.recurringMovement?.valueKind === 'VARIABLE')
const installmentBased = computed(() => props.recurringMovement?.installments != null)

const form = useForm({
  validationSchema: computed(() => launchInPeriodFormSchema(maximum.value)),
})

const periodChoices = computed(() =>
  props.periods.map((period) => ({
    value: period.id,
    label: period.expired
      ? `${period.name} · ${t('financial-period.status.expired-short')}`
      : period.name,
  })),
)

const selectedPeriod = computed(() =>
  props.periods.find((period) => period.id === form.values.financialPeriod),
)

const quantity = computed(() => Number(form.values.quantity))
const quantityValid = computed(
  () => Number.isInteger(quantity.value) && quantity.value >= 1 && quantity.value <= maximum.value,
)

function joinList(items: string[]) {
  const leading = items.slice(0, -1).join(', ')
  const last = items.slice(-1).join('')
  return [leading, last].filter(Boolean).join(` ${t('recurrent-movement.launch-extra.and')} `)
}

const preview = computed(() => {
  const recurringMovement = props.recurringMovement
  const period = selectedPeriod.value
  if (!recurringMovement || !period || !quantityValid.value) {
    return null
  }
  const date = d(new Date(`${period.endingAt}T00:00:00`), 'short')
  if (installmentBased.value) {
    const installments = extraLaunchInstallments(recurringMovement, quantity.value).map(
      (installment) => `${installment}/${recurringMovement.installments}`,
    )
    return t('recurrent-movement.launch-extra.preview-installments', {
      name: recurringMovement.name,
      installments: joinList(installments),
      date,
    })
  }
  return t(
    'recurrent-movement.launch-extra.preview-endless',
    { name: recurringMovement.name, date, count: quantity.value },
    quantity.value,
  )
})

watch(
  [() => props.recurringMovement, () => props.periods],
  () =>
    form.resetForm({
      values: {
        financialPeriod: (nextOpenPeriod(props.periods) ?? props.periods[0])?.id,
        quantity: 1,
      },
    }),
  { immediate: true },
)

const submit = form.handleSubmit((values) => {
  emit(
    'confirm',
    props.recurringMovement as RecurringMovementView,
    toRecurringExtraLaunchForm(values as LaunchInPeriodFormValues, variable.value),
  )
})
</script>

<template>
  <Dialog :open="recurringMovement !== null" @update:open="emit('close')">
    <DialogContent class="sm:max-w-lg">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>
            {{ $t('recurrent-movement.launch-extra.title', { name: recurringMovement?.name }) }}
          </DialogTitle>
          <DialogDescription>
            {{ $t('recurrent-movement.launch-extra.description') }}
          </DialogDescription>
        </DialogHeader>
        <ServerErrorAlert :messages="messages" />
        <Alert v-if="periods.length === 0" variant="attention">
          <AlertDescription>{{ $t('recurrent-movement.launch-extra.no-period') }}</AlertDescription>
        </Alert>
        <SelectField
          name="financialPeriod"
          :label="$t('recurrent-movement.launch-extra.period')"
          :options="periodChoices"
          required
        />
        <InputField
          name="quantity"
          type="number"
          :label="$t('recurrent-movement.launch-extra.quantity')"
          :hint="
            installmentBased
              ? $t('recurrent-movement.launch-extra.quantity-installments', { maximum })
              : $t('recurrent-movement.launch-extra.quantity-endless', { maximum })
          "
          mono
          required
        />
        <LaunchValueField
          v-if="recurringMovement && variable"
          :suggested-value="recurringMovement.suggestedValue"
        />
        <p v-if="preview" class="bg-muted rounded-md p-3 text-sm" data-slot="launch-preview">
          <span class="font-medium">{{ $t('recurrent-movement.launch-extra.preview') }}</span>
          {{ preview }}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" @mousedown.prevent @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="submit" :disabled="loading || periods.length === 0">
            <Check />{{ $t('recurrent-movement.launch-extra.confirm') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
