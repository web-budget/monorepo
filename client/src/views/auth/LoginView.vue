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
import { safeRedirect } from '@/utils/safeRedirect'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { loading } = storeToRefs(auth)
const { showError } = useNotification()

const { handleSubmit } = useForm({
  validationSchema: loginFormSchema,
  initialValues: { email: '', password: '' },
})

async function goAfterLogin() {
  await router.push(safeRedirect(route.query.redirect) ?? { name: 'home' })
}

function notifyFailure(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
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

onMounted(async () => {
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
