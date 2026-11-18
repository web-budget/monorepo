<script setup lang="ts">
import { CircleAlert, Loader2, Timer } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import AuthStepHeader from '@/components/auth/AuthStepHeader.vue'
import PasswordInput from '@/components/forms/PasswordInput.vue'
import GoogleMark from '@/components/icons/GoogleMark.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { loginFormSchema, type LoginFormValues } from '@/schemas/loginSchema'

export type CredentialsFailure = 'credentials' | 'rate-limit'

withDefaults(
  defineProps<{
    loading: boolean
    failure: CredentialsFailure | null
    googleEnabled?: boolean
    registrationEnabled?: boolean
  }>(),
  { googleEnabled: false, registrationEnabled: false },
)

const emit = defineEmits<{ submit: [values: LoginFormValues]; register: [] }>()

const { handleSubmit } = useForm({
  validationSchema: loginFormSchema,
  initialValues: { email: '', password: '' },
})

const submit = handleSubmit((values) => emit('submit', values))
</script>

<template>
  <div class="grid gap-6">
    <AuthStepHeader :title="$t('login.title')">{{ $t('login.description') }}</AuthStepHeader>
    <Alert v-if="failure" variant="destructive" data-slot="login-failure">
      <Timer v-if="failure === 'rate-limit'" />
      <CircleAlert v-else />
      <AlertTitle>{{ $t(`login.failure.${failure}.title`) }}</AlertTitle>
      <AlertDescription>{{ $t(`login.failure.${failure}.description`) }}</AlertDescription>
    </Alert>
    <form novalidate @submit="submit">
      <fieldset class="grid min-w-0 gap-4" :disabled="loading">
        <FormField v-slot="{ componentField }" name="email">
          <FormItem>
            <FormLabel>{{ $t('login.form.email') }}</FormLabel>
            <FormControl>
              <Input
                type="email"
                autocomplete="username"
                :placeholder="$t('login.form.email-placeholder')"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="password">
          <FormItem>
            <div class="flex items-center justify-between">
              <FormLabel>{{ $t('login.form.password') }}</FormLabel>
              <RouterLink
                :to="{ name: 'forgot-password' }"
                class="text-primary text-xs font-medium hover:underline"
              >
                {{ $t('login.form.forgot-password') }}
              </RouterLink>
            </div>
            <FormControl>
              <PasswordInput
                autocomplete="current-password"
                :placeholder="$t('login.form.password-placeholder')"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <Button type="submit" size="lg" class="mt-1 w-full" :disabled="loading">
          <Loader2 v-if="loading" class="animate-spin" />
          {{ loading ? $t('login.form.signing-in') : $t('login.form.sign-in') }}
        </Button>
      </fieldset>
    </form>
    <template v-if="googleEnabled">
      <div class="text-muted-foreground flex items-center gap-3 text-xs">
        <span class="bg-border h-px flex-1" />
        {{ $t('login.divider') }}
        <span class="bg-border h-px flex-1" />
      </div>
      <Button variant="outline" size="lg" class="w-full" as-child>
        <a href="/private/oauth2/authorization/google">
          <GoogleMark />
          {{ $t('login.google') }}
        </a>
      </Button>
    </template>
    <p v-if="registrationEnabled" class="text-muted-foreground text-center">
      {{ $t('login.register.prompt') }}
      <button
        type="button"
        class="text-primary font-medium hover:underline"
        @click="emit('register')"
      >
        {{ $t('login.register.action') }}
      </button>
    </p>
  </div>
</template>
