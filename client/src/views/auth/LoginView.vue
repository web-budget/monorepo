<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import PasswordInput from '@/components/forms/PasswordInput.vue'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useNotification } from '@/composables/useNotification'
import { loginFormSchema } from '@/schemas/loginSchema'
import { useAuthStore } from '@/stores/auth'
import { describeApiError } from '@/utils/apiErrorNotice'
import { queryValue } from '@/utils/queryValue'
import { safeRedirect } from '@/utils/safeRedirect'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { loading } = storeToRefs(auth)
const { showError, showWarn } = useNotification()

const SESSION_END_REASONS = ['inactivity', 'expired']

const { handleSubmit } = useForm({
  validationSchema: loginFormSchema,
  initialValues: { email: '', password: '' },
})

async function goAfterLogin() {
  await router.push(safeRedirect(route.query.redirect) ?? { name: 'home' })
}

function notifyFailure(error: unknown) {
  if (error instanceof ApiError && describeApiError(error) === null) {
    showError('error.login.detail', 'error.login.description')
  }
}

const submit = handleSubmit(async (values) => {
  try {
    await auth.login(values)
  } catch (error) {
    notifyFailure(error)
    return
  }
  await goAfterLogin()
})

function notifySessionEnded() {
  const reason = queryValue(route.query.reason)
  if (SESSION_END_REASONS.includes(reason)) {
    showWarn('login.session-ended.title', `login.session-ended.${reason}`)
  }
}

onMounted(async () => {
  notifySessionEnded()
  if (auth.endingSession) {
    return
  }
  if (auth.isAuthenticated || (await auth.restoreSession())) {
    await goAfterLogin()
  }
})
</script>

<template>
  <h1 class="text-muted-foreground mb-8 text-center font-medium">{{ $t('login.title') }}</h1>
  <form class="grid gap-6" novalidate @submit="submit">
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
        <FormLabel>{{ $t('login.form.password') }}</FormLabel>
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
    <Button type="submit" class="w-full" :disabled="loading">
      <Loader2 v-if="loading" class="animate-spin" />
      {{ $t('login.form.sign-in') }}
    </Button>
    <RouterLink
      :to="{ name: 'forgot-password' }"
      class="text-primary text-center text-sm font-medium hover:underline"
    >
      {{ $t('login.form.forgot-password') }}
    </RouterLink>
  </form>
</template>
