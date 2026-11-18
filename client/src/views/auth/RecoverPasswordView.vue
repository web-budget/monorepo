<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { useRoute, useRouter } from 'vue-router'
import AuthStepHeader from '@/components/auth/AuthStepHeader.vue'
import PasswordRequirements from '@/components/auth/PasswordRequirements.vue'
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

const email = queryValue(route.query.email)

const { handleSubmit, values } = useForm({
  validationSchema: recoverPasswordFormSchema,
  initialValues: { password: '', confirmation: '' },
})

const submit = handleSubmit(async ({ password }) => {
  try {
    await account.recoverPassword({
      token: queryValue(route.query.token),
      email,
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
  <div class="grid gap-6">
    <AuthStepHeader :title="$t('recover-password.title')">
      <i18n-t keypath="recover-password.description" scope="global">
        <template #email>
          <span class="text-foreground font-medium">{{ email }}</span>
        </template>
      </i18n-t>
    </AuthStepHeader>
    <form class="grid gap-4" novalidate @submit="submit">
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
          <PasswordRequirements :password="values.password" />
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
      <Button type="submit" size="lg" class="mt-1 w-full" :disabled="loading">
        <Loader2 v-if="loading" class="animate-spin" />
        {{ loading ? $t('recover-password.form.submitting') : $t('recover-password.form.submit') }}
      </Button>
    </form>
  </div>
</template>
