<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { useRoute, useRouter } from 'vue-router'
import PasswordInput from '@/components/forms/PasswordInput.vue'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useNotification } from '@/composables/useNotification'
import { recoverPasswordFormSchema } from '@/schemas/recoverPasswordSchema'
import { useAccountStore } from '@/stores/account'
import { queryValue } from '@/utils/queryValue'

const route = useRoute()
const router = useRouter()
const account = useAccountStore()
const { loading } = storeToRefs(account)
const { showSuccess } = useNotification()

const { handleSubmit } = useForm({
  validationSchema: recoverPasswordFormSchema,
  initialValues: { password: '', confirmation: '' },
})

const submit = handleSubmit(async ({ password }) => {
  try {
    await account.recoverPassword({
      token: queryValue(route.query.token),
      email: queryValue(route.query.email),
      password,
    })
  } catch {
    return
  }
  showSuccess('notification.success', 'notification.recover-password.success')
  await router.push({ name: 'login' })
})
</script>

<template>
  <h1 class="text-muted-foreground mb-8 text-center font-medium">
    {{ $t('recover-password.title') }}
  </h1>
  <form class="grid gap-6" novalidate @submit="submit">
    <FormField v-slot="{ componentField }" name="password">
      <FormItem>
        <FormLabel>{{ $t('recover-password.form.password') }}</FormLabel>
        <FormControl>
          <PasswordInput
            autocomplete="new-password"
            :placeholder="$t('recover-password.form.password-placeholder')"
            v-bind="componentField"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="confirmation">
      <FormItem>
        <FormLabel>{{ $t('recover-password.form.confirmation') }}</FormLabel>
        <FormControl>
          <PasswordInput
            autocomplete="new-password"
            :placeholder="$t('recover-password.form.confirmation-placeholder')"
            v-bind="componentField"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <Button type="submit" class="w-full" :disabled="loading">
      <Loader2 v-if="loading" class="animate-spin" />
      {{ $t('form.recover') }}
    </Button>
  </form>
</template>
