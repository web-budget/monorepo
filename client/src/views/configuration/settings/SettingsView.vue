<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, nextTick, onMounted, ref } from 'vue'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useDiscardGuard } from '@/composables/useDiscardGuard'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import {
  MAXIMUM_RESERVE_MONTHS,
  MINIMUM_RESERVE_MONTHS,
  settingsFormSchema,
  toInstanceSettingsForm,
  toSettingsFormValues,
} from '@/schemas/settingsSchema'
import { useSettingsStore } from '@/stores/settings'

const store = useSettingsStore()
const { showSuccess } = useNotification()
const { messages, run } = useServerErrors()

const form = useForm({ validationSchema: settingsFormSchema })

const submitting = ref(false)
const loadingRecord = ref(false)
const dirty = computed(() => form.meta.value.dirty)

useDiscardGuard(
  () => dirty.value,
  () => '',
)

function focusFirstInvalidControl() {
  document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus()
}

const onSubmit = form.handleSubmit(
  async (values) => {
    submitting.value = true
    try {
      await run(async () => {
        const saved = await store.update(toInstanceSettingsForm(values))
        form.resetForm({ values: toSettingsFormValues(saved) })
        showSuccess('settings.toast.saved', 'settings.toast.saved-detail', true, {
          count: saved.reserveMonths,
        })
      })
    } finally {
      submitting.value = false
    }
  },
  () => nextTick(focusFirstInvalidControl),
)

onMounted(async () => {
  loadingRecord.value = true
  try {
    await run(async () => {
      form.resetForm({ values: toSettingsFormValues(await store.find()) })
    })
  } finally {
    loadingRecord.value = false
  }
})
</script>

<template>
  <FormCard
    :title="$t('settings.title')"
    description=""
    :loading="loadingRecord"
    :submitting="submitting"
    :dirty="dirty"
    :messages="messages"
    :submit-label="$t('form.save')"
    @submit="onSubmit"
    @back="form.resetForm()"
  >
    <FormSection :title="$t('settings.sections.reserve')">
      <FormField
        v-slot="{ value, errors, handleChange, handleBlur }"
        name="reserveMonths"
        :validate-on-model-update="false"
      >
        <FormItem class="max-w-xs">
          <FormLabel required>{{ $t('settings.form.reserve-months') }}</FormLabel>
          <FormControl>
            <Input
              name="reserveMonths"
              type="number"
              step="1"
              :min="MINIMUM_RESERVE_MONTHS"
              :max="MAXIMUM_RESERVE_MONTHS"
              class="w-28 font-mono"
              :model-value="value"
              @update:model-value="handleChange($event, errors.length > 0)"
              @blur="handleBlur"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </FormSection>
  </FormCard>
</template>
