<script setup lang="ts">
import { useForm } from 'vee-validate'
import { watch } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
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
  readjustFormSchema,
  toRecurringValueForm,
  type ReadjustFormValues,
} from '@/schemas/recurringMovementSchema'
import type { RecurringValueForm } from '@/types'

interface ReadjustableRecurringMovement {
  id: string
  name: string
  value: number
}

const props = defineProps<{
  recurringMovement: ReadjustableRecurringMovement | null
  loading: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [recurringMovement: ReadjustableRecurringMovement, form: RecurringValueForm]
}>()

const form = useForm({ validationSchema: readjustFormSchema })

watch(
  () => props.recurringMovement,
  () => form.resetForm({ values: {} }),
)

const submit = form.handleSubmit((values) => {
  emit(
    'confirm',
    props.recurringMovement as ReadjustableRecurringMovement,
    toRecurringValueForm(values as ReadjustFormValues),
  )
})
</script>

<template>
  <Dialog :open="recurringMovement !== null" @update:open="emit('close')">
    <DialogContent class="sm:max-w-md">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>
            {{ $t('recurrent-movement.readjust.title', { name: recurringMovement?.name }) }}
          </DialogTitle>
          <DialogDescription>{{ $t('recurrent-movement.readjust.description') }}</DialogDescription>
        </DialogHeader>
        <MoneyField name="value" :label="$t('recurrent-movement.readjust.value')" required />
        <p class="text-muted-foreground -mt-2 text-xs" data-slot="readjust-current">
          {{ $t('recurrent-movement.readjust.current') }}
          <CurrencyDisplay :value="recurringMovement?.value ?? 0" />
        </p>
        <InputField
          name="reason"
          :label="$t('recurrent-movement.readjust.reason')"
          :maxlength="150"
        />
        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="submit" :disabled="loading">
            {{ $t('recurrent-movement.readjust.confirm') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
