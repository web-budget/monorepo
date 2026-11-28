<script setup lang="ts">
import { CircleAlert, CircleCheck, KeyRound, LoaderCircle, Mail, Send } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError } from '@/api/client'
import { mailSettingsApi } from '@/api/mailSettings'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import SelectField from '@/components/forms/SelectField.vue'
import ListState from '@/components/listing/ListState.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDiscardGuard } from '@/composables/useDiscardGuard'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import {
  MAIL_SECURITIES,
  mailSettingsFormSchema,
  mailTestRecipientSchema,
  toMailSettingsForm,
  toMailSettingsFormValues,
} from '@/schemas/mailSettingsSchema'
import { useAuthStore } from '@/stores/auth'
import { useMailSettingsStore } from '@/stores/mailSettings'
import { describeApiError } from '@/utils/apiErrorNotice'
import { markHandled } from '@/utils/handledErrors'

const PASSWORD_MASK = '••••••••'

const { t } = useI18n()
const store = useMailSettingsStore()
const auth = useAuthStore()
const { showSuccess } = useNotification()
const { messages, fields, run } = useServerErrors()
const testFailure = ref<string[]>([])

const form = useForm({ validationSchema: mailSettingsFormSchema })

const submitting = ref(false)
const loadingRecord = ref(false)
const loadFailed = ref(false)
const switching = ref(false)
const testing = ref(false)
const recipient = ref(auth.session?.email ?? '')
const recipientError = ref('')
const testOutcome = ref<'sent' | 'failed' | null>(null)
const testedRecipient = ref('')

const dirty = computed(() => form.meta.value.dirty)
const settings = computed(() => store.settings)
const configured = computed(() => settings.value?.configured ?? false)
const locked = computed(
  () => settings.value !== null && settings.value.passwordStorageAvailable === false,
)
const securityOptions = computed(() =>
  MAIL_SECURITIES.map((security) => ({
    value: security,
    label: t(`mail-settings.security.${security}`),
  })),
)

const withoutUsername = computed(() => (form.values.username ?? '').trim() === '')
const passwordSaved = computed(() => settings.value?.passwordSet ?? false)
const passwordPlaceholder = computed(() =>
  passwordSaved.value && !withoutUsername.value && !locked.value ? PASSWORD_MASK : undefined,
)
const passwordHint = computed(() => {
  if (!passwordSaved.value || locked.value) {
    return null
  }
  if (withoutUsername.value) {
    return { key: 'mail-settings.password.removed', error: true }
  }
  return form.values.password ? null : { key: 'mail-settings.password.saved', error: false }
})

const canTest = computed(() => configured.value && !locked.value && !dirty.value && !testing.value)

useDiscardGuard(
  () => dirty.value,
  () => '',
)

function focusFirstInvalidControl() {
  document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus()
}

async function load() {
  loadingRecord.value = true
  const loaded = await run(async () => {
    form.resetForm({ values: toMailSettingsFormValues(await store.find()) })
  })
  loadFailed.value = !loaded
  loadingRecord.value = false
}

const onSubmit = form.handleSubmit(
  async (values) => {
    submitting.value = true
    try {
      await run(async () => {
        const saved = await store.update(toMailSettingsForm(values))
        form.resetForm({ values: toMailSettingsFormValues(saved) })
        testOutcome.value = null
        showSuccess('mail-settings.toast.saved')
      })
    } finally {
      submitting.value = false
    }
  },
  () => nextTick(focusFirstInvalidControl),
)

async function toggleEnabled(enabled: boolean) {
  switching.value = true
  try {
    await run(async () => {
      await store.updateEnabled(enabled)
      showSuccess(enabled ? 'mail-settings.toast.enabled' : 'mail-settings.toast.disabled')
    })
  } finally {
    switching.value = false
  }
}

function failureMessages(error: unknown): string[] {
  if (error instanceof ApiError && error.error === 'mail-delivery-failed') {
    return [(error.parameters as { reason: string }).reason]
  }
  return (describeApiError(error)?.details ?? []).map(({ key, params }) => t(key, { ...params }))
}

function changeRecipient(value: string | number) {
  recipient.value = String(value)
  recipientError.value = ''
}

async function sendTest() {
  if (!canTest.value) {
    return
  }
  const parsed = mailTestRecipientSchema.safeParse(recipient.value)
  if (!parsed.success) {
    recipientError.value = parsed.error.issues.map((issue) => issue.message).join(' ')
    return
  }
  testing.value = true
  testOutcome.value = null
  testedRecipient.value = recipient.value.trim()
  try {
    await mailSettingsApi.sendTest(testedRecipient.value)
    testOutcome.value = 'sent'
  } catch (error) {
    markHandled(error)
    testFailure.value = failureMessages(error)
    testOutcome.value = 'failed'
  } finally {
    testing.value = false
  }
}

onMounted(load)
</script>

<template>
  <PageContainer v-if="loadFailed">
    <PageHeader :title="$t('mail-settings.title')" :description="$t('mail-settings.description')" />
    <ListState kind="error" entity="mail-settings" :icon="Mail" @retry="load" />
  </PageContainer>
  <FormCard
    v-else
    :title="$t('mail-settings.title')"
    :description="$t('mail-settings.description')"
    :loading="loadingRecord"
    :submitting="submitting"
    :dirty="dirty"
    :readonly="locked"
    :messages="messages"
    :fields="fields"
    :submit-label="$t('form.save')"
    @submit="onSubmit"
    @back="form.resetForm()"
  >
    <template #before>
      <template v-if="settings">
        <Alert v-if="locked" variant="destructive" data-slot="encryption-key-alert">
          <KeyRound />
          <AlertTitle>{{ $t('mail-settings.key-missing.title') }}</AlertTitle>
          <AlertDescription>{{ $t('mail-settings.key-missing.description') }}</AlertDescription>
        </Alert>
        <Card
          class="flex-row flex-wrap items-center justify-between gap-3 px-5 py-4"
          data-slot="sending-card"
        >
          <label for="mail-enabled" class="flex items-center gap-3 font-medium">
            <Switch
              id="mail-enabled"
              :model-value="settings.enabled"
              :disabled="locked || !configured || switching"
              @update:model-value="toggleEnabled"
            />
            {{ $t('mail-settings.sending.label') }}
          </label>
          <template v-if="!locked">
            <Badge v-if="!configured" variant="highlight">
              {{ $t('mail-settings.sending.no-server') }}
            </Badge>
            <span
              v-else-if="switching"
              class="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
            >
              <LoaderCircle class="size-3.5 animate-spin" />
              {{ $t(`mail-settings.sending.turning.${settings.enabled ? 'off' : 'on'}`) }}
            </span>
            <Badge v-else-if="settings.enabled" variant="approved">
              {{ $t('mail-settings.sending.on') }}
            </Badge>
            <Badge
              v-else
              variant="neutral"
              class="before:size-1.5 before:rounded-full before:bg-current before:content-['']"
            >
              {{ $t('mail-settings.sending.off') }}
            </Badge>
          </template>
        </Card>
      </template>
    </template>

    <template v-if="settings?.lastUpdate" #saved>
      <i18n-t keypath="mail-settings.saved-at" tag="span">
        <template #date><DateTimeDisplay :value="settings.lastUpdate" with-time /></template>
      </i18n-t>
    </template>

    <FormSection
      :title="$t('mail-settings.sections.server')"
      columns="md:grid-cols-[minmax(0,1fr)_7rem_10rem]"
    >
      <InputField
        name="host"
        :label="$t('mail-settings.form.host')"
        :placeholder="$t('mail-settings.form.host-placeholder')"
        :maxlength="255"
        autocomplete="off"
        required
      />
      <InputField
        name="port"
        :label="$t('mail-settings.form.port')"
        :placeholder="$t('mail-settings.form.port-placeholder')"
        inputmode="numeric"
        autocomplete="off"
        mono
        required
      />
      <SelectField
        name="security"
        :label="$t('mail-settings.form.security')"
        :options="securityOptions"
        required
      />
    </FormSection>

    <FormSection :title="$t('mail-settings.sections.authentication')">
      <InputField
        name="username"
        :label="$t('mail-settings.form.username')"
        :maxlength="255"
        autocomplete="off"
      />
      <FormField
        v-slot="{ value, errors, handleChange, handleBlur }"
        name="password"
        :validate-on-model-update="false"
      >
        <FormItem>
          <FormLabel>{{ $t('mail-settings.form.password') }}</FormLabel>
          <FormControl>
            <Input
              name="password"
              type="password"
              autocomplete="new-password"
              :placeholder="passwordPlaceholder"
              :disabled="withoutUsername"
              :model-value="value"
              @update:model-value="handleChange($event, errors.length > 0)"
              @blur="handleBlur"
            />
          </FormControl>
          <FormDescription
            v-if="passwordHint"
            :class="passwordHint.error && 'text-destructive'"
            data-slot="password-hint"
          >
            {{ $t(passwordHint.key) }}
          </FormDescription>
          <FormMessage />
        </FormItem>
      </FormField>
    </FormSection>

    <FormSection :title="$t('mail-settings.sections.sender')">
      <InputField
        name="fromAddress"
        type="email"
        :label="$t('mail-settings.form.from-address')"
        :placeholder="$t('mail-settings.form.from-address-placeholder')"
        :maxlength="255"
        autocomplete="off"
        required
      />
      <InputField
        name="fromName"
        :label="$t('mail-settings.form.from-name')"
        :placeholder="$t('mail-settings.form.from-name-placeholder')"
        :maxlength="90"
        autocomplete="off"
      />
      <InputField
        name="replyToAddress"
        type="email"
        :label="$t('mail-settings.form.reply-to-address')"
        :maxlength="255"
        autocomplete="off"
      />
    </FormSection>

    <FormSection :title="$t('mail-settings.sections.test')" columns="md:max-w-xl">
      <div class="flex flex-wrap items-start gap-3">
        <div class="grid min-w-[min(100%,16rem)] flex-1 content-start gap-2">
          <Label for="mail-test-recipient" :class="recipientError && 'text-destructive'">
            {{ $t('mail-settings.test.recipient') }}
            <span class="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="mail-test-recipient"
            type="email"
            autocomplete="email"
            :model-value="recipient"
            :disabled="!configured || locked"
            :aria-invalid="recipientError !== ''"
            @update:model-value="changeRecipient"
            @keydown.enter.prevent="sendTest"
          />
          <p v-if="recipientError" class="text-destructive text-xs">{{ recipientError }}</p>
        </div>
        <div class="grid gap-2">
          <span class="invisible text-sm leading-none max-md:hidden" aria-hidden="true">.</span>
          <Button
            type="button"
            variant="outline"
            :disabled="!canTest"
            data-slot="send-test"
            @click="sendTest"
          >
            <template v-if="testing">
              <LoaderCircle class="animate-spin" />{{ $t('mail-settings.test.sending') }}
            </template>
            <template v-else><Send />{{ $t('mail-settings.test.send') }}</template>
          </Button>
        </div>
      </div>
      <Alert
        v-if="testOutcome === 'sent'"
        role="status"
        class="border-border bg-income-muted [&>svg]:text-income"
        data-slot="test-sent"
      >
        <CircleCheck />
        <AlertTitle>{{ $t('mail-settings.test.sent.title') }}</AlertTitle>
        <AlertDescription>
          {{ $t('mail-settings.test.sent.description', { recipient: testedRecipient }) }}
        </AlertDescription>
      </Alert>
      <Alert v-else-if="testOutcome === 'failed'" variant="destructive" data-slot="test-failed">
        <CircleAlert />
        <AlertTitle>{{ $t('mail-settings.test.failed') }}</AlertTitle>
        <AlertDescription class="font-mono text-xs break-words">
          <p v-for="message in testFailure" :key="message">{{ message }}</p>
        </AlertDescription>
      </Alert>
    </FormSection>
  </FormCard>
</template>
