<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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

const { n } = useI18n()

const form = useForm({ validationSchema: readjustFormSchema })

const currentValue = computed(() => props.recurringMovement?.value ?? 0)
const placeholder = computed(() => n(currentValue.value, 'currency').replace(/^R\$\s*/, ''))

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
    <DialogContent class="sm:max-w-lg">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>
            {{ $t('recurrent-movement.readjust.title', { name: recurringMovement?.name }) }}
          </DialogTitle>
          <DialogDescription>{{ $t('recurrent-movement.readjust.description') }}</DialogDescription>
        </DialogHeader>
        <MoneyField
          name="value"
          :label="$t('recurrent-movement.readjust.value')"
          :placeholder="placeholder"
          :hint="$t('recurrent-movement.readjust.current', { value: $n(currentValue, 'currency') })"
          required
        />
        <InputField
          name="reason"
          :label="$t('recurrent-movement.readjust.reason')"
          :placeholder="$t('recurrent-movement.readjust.reason-example')"
          :maxlength="150"
        />
        <DialogFooter>
          <Button type="button" variant="outline" @mousedown.prevent @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="submit" :disabled="loading">
            <Check />{{ $t('recurrent-movement.readjust.confirm') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
