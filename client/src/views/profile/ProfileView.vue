<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import SelectField from '@/components/forms/SelectField.vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDiscardGuard } from '@/composables/useDiscardGuard'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { LANGUAGE_LOCALES, SUPPORTED_LOCALES } from '@/locales/languages'
import { profileFormSchema, type ProfileFormValues } from '@/schemas/profileSchema'
import { useAuthStore } from '@/stores/auth'
import { useLanguageStore } from '@/stores/language'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const language = useLanguageStore()
const { showSuccess } = useNotification()
const { messages, run } = useServerErrors()

const form = useForm({
  validationSchema: profileFormSchema,
  initialValues: initialValues(),
})

const canReceiveNotices = computed(() => auth.hasRole('FINANCIAL'))
const dirty = computed(() => form.meta.value.dirty)
const submitting = ref(false)

const languageChoices = computed(() =>
  SUPPORTED_LOCALES.map((locale) => ({ value: locale, label: t(`profile.languages.${locale}`) })),
)

useDiscardGuard(
  () => dirty.value,
  () => auth.session!.name,
)

function initialValues(): ProfileFormValues {
  return {
    language: LANGUAGE_LOCALES[auth.session!.language],
    dueDateNotices: auth.session!.dueDateNotices,
  }
}

async function save(values: ProfileFormValues) {
  const current = initialValues()
  if (values.language !== current.language) {
    await language.select(values.language)
  }
  if (values.dueDateNotices !== current.dueDateNotices) {
    await auth.changeDueDateNotices(values.dueDateNotices)
  }
}

const onSubmit = form.handleSubmit(async (values) => {
  submitting.value = true
  const succeeded = await run(() => save(values))
  submitting.value = false
  if (!succeeded) {
    return
  }
  form.resetForm({ values })
  showSuccess(
    'profile.toast.saved',
    canReceiveNotices.value
      ? `profile.toast.notices-${values.dueDateNotices ? 'on' : 'off'}`
      : undefined,
  )
})

function cancel() {
  if (window.history.state?.back) {
    router.back()
    return
  }
  return router.push({ name: 'start' })
}
</script>

<template>
  <FormCard
    :title="$t('profile.title')"
    :description="$t('profile.description')"
    :loading="false"
    :submitting="submitting"
    :dirty="dirty"
    :messages="messages"
    :submit-label="$t('form.save')"
    @submit="onSubmit"
    @back="cancel"
  >
    <FormSection :title="$t('profile.sections.data')" :description="$t('profile.data-hint')">
      <div class="grid content-start gap-2">
        <Label for="profile-name">{{ $t('profile.form.name') }}</Label>
        <Input id="profile-name" :model-value="auth.session?.name" readonly />
      </div>
      <div class="grid content-start gap-2">
        <Label for="profile-email">{{ $t('profile.form.email') }}</Label>
        <Input id="profile-email" :model-value="auth.session?.email" readonly />
      </div>
      <SelectField
        name="language"
        :label="$t('profile.form.language')"
        :options="languageChoices"
        class="md:col-span-2"
      />
    </FormSection>
    <FormSection v-if="canReceiveNotices" :title="$t('profile.sections.notices')">
      <StatusToggle
        name="dueDateNotices"
        :heading="$t('profile.sections.notices')"
        :label="$t('profile.form.notices')"
        :hint="
          $t(form.values.dueDateNotices ? 'profile.form.notices-on' : 'profile.form.notices-off')
        "
      />
      <ul class="text-muted-foreground grid gap-1.5 text-sm md:col-span-2" data-slot="notice-kinds">
        <li>{{ $t('profile.notices.daily') }}</li>
        <li>{{ $t('profile.notices.weekly') }}</li>
      </ul>
    </FormSection>
  </FormCard>
</template>
