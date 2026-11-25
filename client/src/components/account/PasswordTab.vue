<script setup lang="ts">
import { CircleAlert, LoaderCircle, LogOut } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed, provide, ref } from 'vue'
import GoogleNotice from '@/components/account/GoogleNotice.vue'
import PasswordRequirements from '@/components/auth/PasswordRequirements.vue'
import PasswordInput from '@/components/forms/PasswordInput.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SERVER_ERROR_ALERT_ID,
  SERVER_FIELDS_INJECTION_KEY,
} from '@/components/ui/form'
import { useNotification } from '@/composables/useNotification'
import { ApiError } from '@/api/client'
import { changePasswordFormSchema } from '@/schemas/changePasswordSchema'
import { useAuthStore } from '@/stores/auth'
import { markHandled } from '@/utils/handledErrors'
import { fitsPasswordBytes, PASSWORD_MAX_BYTES } from '@/utils/passwordRules'

type Failure = 'wrong' | 'limit'

const FAILURES: Record<string, Failure> = {
  invalid_current_password: 'wrong',
  too_many_password_change_attempts: 'limit',
}

const auth = useAuthStore()
const { showSuccess } = useNotification()

const failure = ref<Failure | null>(null)

const { handleSubmit, isSubmitting, values, resetForm } = useForm({
  validationSchema: changePasswordFormSchema,
  initialValues: { currentPassword: '', newPassword: '', confirmation: '' },
})

provide(
  SERVER_FIELDS_INJECTION_KEY,
  computed(() => (failure.value === 'wrong' ? ['currentPassword'] : [])),
)

const typedPassword = computed(() => values.newPassword as string)
const newPasswordBytes = computed(() => new TextEncoder().encode(typedPassword.value).length)
const overBytes = computed(() => !fitsPasswordBytes(typedPassword.value))

const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
  failure.value = null
  try {
    await auth.changePassword({ currentPassword, newPassword })
  } catch (error) {
    const known = error instanceof ApiError && error.error ? FAILURES[error.error] : undefined
    if (known) {
      markHandled(error)
      failure.value = known
    }
    return
  }
  resetForm()
  showSuccess('account.password.saved', 'account.password.saved-detail')
})
</script>

<template>
  <GoogleNotice v-if="!auth.session?.hasPassword" class="m-5 self-start max-md:m-4" />
  <form v-else class="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]" novalidate @submit="submit">
    <div class="min-h-0 overflow-auto p-5 max-md:p-4">
      <div class="grid gap-4 md:max-w-md">
        <Alert role="status">
          <LogOut />
          <AlertTitle>{{ $t('account.password.notice') }}</AlertTitle>
        </Alert>
        <Alert v-if="failure" :id="SERVER_ERROR_ALERT_ID" variant="destructive" role="alert">
          <CircleAlert />
          <AlertTitle>{{ $t(`account.password.failure.${failure}.title`) }}</AlertTitle>
          <AlertDescription class="text-muted-foreground">
            {{ $t(`account.password.failure.${failure}.description`) }}
          </AlertDescription>
        </Alert>
        <FormField v-slot="{ componentField }" name="currentPassword">
          <FormItem>
            <FormLabel>{{ $t('account.password.current') }}</FormLabel>
            <FormControl>
              <PasswordInput autocomplete="current-password" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="newPassword">
          <FormItem>
            <FormLabel>{{ $t('account.password.new') }}</FormLabel>
            <FormControl>
              <PasswordInput autocomplete="new-password" v-bind="componentField" />
            </FormControl>
            <template v-if="overBytes">
              <FormMessage />
              <i18n-t
                keypath="account.password.bytes"
                tag="p"
                scope="global"
                class="text-muted-foreground text-xs"
                data-slot="password-bytes"
              >
                <template #count>
                  <span class="font-mono tabular-nums">
                    {{
                      $t('account.password.bytes-count', {
                        count: newPasswordBytes,
                        maximum: PASSWORD_MAX_BYTES,
                      })
                    }}
                  </span>
                </template>
              </i18n-t>
            </template>
            <template v-else>
              <PasswordRequirements :password="typedPassword" />
              <FormMessage />
            </template>
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="confirmation">
          <FormItem>
            <FormLabel>{{ $t('account.password.confirmation') }}</FormLabel>
            <FormControl>
              <PasswordInput autocomplete="new-password" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>
    </div>
    <div class="border-border bg-muted flex justify-end gap-2 border-t px-5 py-3">
      <Button type="submit" :disabled="isSubmitting" :aria-busy="isSubmitting">
        <LoaderCircle v-if="isSubmitting" class="animate-spin" />
        {{ isSubmitting ? $t('account.password.saving') : $t('account.password.save') }}
      </Button>
    </div>
  </form>
</template>
