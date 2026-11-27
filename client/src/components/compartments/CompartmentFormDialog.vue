<script setup lang="ts">
import { Check, Plus } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed, nextTick, watch } from 'vue'
import InputField from '@/components/forms/InputField.vue'
import MoneyField from '@/components/forms/MoneyField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
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
  COMPARTMENT_TYPES,
  compartmentFormSchema,
  isGoal,
  toCompartmentFormValues,
  type CompartmentFormValues,
} from '@/schemas/compartmentSchema'
import type { CompartmentView } from '@/types'
import { typeOptions } from '@/utils/typeLabels'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  open: boolean
  walletName: string
  compartment: CompartmentView | null
  resetToken: number
  loading: boolean
  messages: string[]
  fieldErrors: Record<string, string>
}>()

const emit = defineEmits<{ close: []; submit: [values: CompartmentFormValues] }>()

const BLANK_VALUES = {
  name: '',
  type: undefined,
  description: '',
  targetValue: null,
  targetDate: '',
} as never

const { t } = useI18n()

const form = useForm({ validationSchema: compartmentFormSchema })

const editing = computed(() => props.compartment !== null)
const goal = computed(() => isGoal((form.values as Partial<CompartmentFormValues>).type))
const descriptionLength = computed(
  () => ((form.values as Partial<CompartmentFormValues>).description as string).length,
)
const typeChoices = computed(() => typeOptions('compartment', COMPARTMENT_TYPES, t))

watch(
  () => [props.open, props.compartment, props.resetToken],
  async () => {
    form.resetForm({
      values: props.compartment ? toCompartmentFormValues(props.compartment) : BLANK_VALUES,
    })
    await nextTick()
    document.querySelector<HTMLInputElement>('[data-slot="compartment-form"] input')?.focus()
  },
  { immediate: true },
)

watch(
  () => props.fieldErrors,
  (errors) => form.setErrors(errors),
)

const submit = form.handleSubmit((values) => {
  emit('submit', values as CompartmentFormValues)
})
</script>

<template>
  <Dialog :open="open" @update:open="emit('close')">
    <DialogContent class="sm:max-w-md">
      <form
        class="flex flex-col gap-4"
        data-slot="compartment-form"
        novalidate
        @submit.prevent="submit"
      >
        <DialogHeader>
          <DialogTitle>
            {{
              compartment
                ? $t('compartment.form.title-editing', { name: compartment.name })
                : $t('compartment.form.title-new')
            }}
          </DialogTitle>
          <DialogDescription class="sr-only">{{ walletName }}</DialogDescription>
        </DialogHeader>
        <ServerErrorAlert :messages="messages" />
        <InputField name="name" :label="$t('compartment.form.name')" :maxlength="150" required />
        <SelectField
          name="type"
          :label="$t('compartment.form.type')"
          :options="typeChoices"
          :placeholder="$t('compartment.form.type-placeholder')"
          :disabled="editing"
          :required="!editing"
        />
        <template v-if="goal">
          <div class="grid gap-1">
            <InputField
              name="description"
              :label="$t('compartment.form.description')"
              :maxlength="150"
              multiline
            />
            <span class="text-muted-foreground justify-self-end font-mono text-[11px]">
              {{ descriptionLength }}/150
            </span>
          </div>
          <div class="grid grid-cols-2 items-start gap-3">
            <MoneyField name="targetValue" :label="$t('compartment.form.target-value')" />
            <InputField
              name="targetDate"
              type="date"
              mono
              :label="$t('compartment.form.target-date')"
            />
          </div>
        </template>
        <DialogFooter>
          <Button type="button" variant="outline" @mousedown.prevent @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="submit" :disabled="loading">
            <Check v-if="editing" /><Plus v-else />
            {{ editing ? $t('compartment.form.save') : $t('compartment.form.create') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
