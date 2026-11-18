<script setup lang="ts">
import { Loader2, MailCheck } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { ref } from 'vue'
import AuthStatusIcon from '@/components/auth/AuthStatusIcon.vue'
import AuthStepHeader from '@/components/auth/AuthStepHeader.vue'
import BackToLogin from '@/components/auth/BackToLogin.vue'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { forgotPasswordFormSchema } from '@/schemas/forgotPasswordSchema'
import { useAccountStore } from '@/stores/account'

const account = useAccountStore()
const { loading } = storeToRefs(account)

const sentTo = ref<string | null>(null)

const { handleSubmit } = useForm({
  validationSchema: forgotPasswordFormSchema,
  initialValues: { email: '' },
})

const submit = handleSubmit(async (values) => {
  try {
    await account.forgotPassword(values)
  } catch {
    return
  }
  sentTo.value = values.email
})
</script>

<template>
  <div v-if="sentTo" class="grid gap-6">
    <AuthStatusIcon :icon="MailCheck" tone="accent" />
    <AuthStepHeader :title="$t('forgot-password.sent.title')">
      <i18n-t keypath="forgot-password.sent.description" scope="global">
        <template #email>
          <span class="text-foreground font-medium">{{ sentTo }}</span>
        </template>
      </i18n-t>
    </AuthStepHeader>
    <BackToLogin button />
  </div>
  <div v-else class="grid gap-6">
    <AuthStepHeader :title="$t('forgot-password.title')">
      {{ $t('forgot-password.description') }}
    </AuthStepHeader>
    <form class="grid gap-4" novalidate @submit="submit">
      <FormField v-slot="{ componentField }" name="email">
        <FormItem>
          <FormLabel>{{ $t('forgot-password.form.email') }}</FormLabel>
          <FormControl>
            <Input
              type="email"
              autocomplete="email"
              :placeholder="$t('forgot-password.form.email-placeholder')"
              v-bind="componentField"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <Button type="submit" size="lg" class="mt-1 w-full" :disabled="loading">
        <Loader2 v-if="loading" class="animate-spin" />
        {{ loading ? $t('forgot-password.form.submitting') : $t('forgot-password.form.submit') }}
      </Button>
    </form>
    <BackToLogin />
  </div>
</template>
