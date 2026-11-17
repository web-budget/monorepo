<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useNotification } from '@/composables/useNotification'
import { forgotPasswordFormSchema } from '@/schemas/forgotPasswordSchema'
import { useAccountStore } from '@/stores/account'

const account = useAccountStore()
const { loading } = storeToRefs(account)
const { showSuccess } = useNotification()

const { handleSubmit, resetForm } = useForm({
  validationSchema: forgotPasswordFormSchema,
  initialValues: { email: '' },
})

const submit = handleSubmit(async (values) => {
  try {
    await account.forgotPassword(values)
  } catch {
    return
  }
  showSuccess('notification.success', 'notification.forgot-password.requested')
  resetForm()
})
</script>

<template>
  <h1 class="text-muted-foreground mb-8 text-center font-medium">
    {{ $t('forgot-password.title') }}
  </h1>
  <form class="grid gap-6" novalidate @submit="submit">
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
    <div class="grid grid-cols-2 gap-4">
      <Button variant="outline" as-child>
        <RouterLink :to="{ name: 'login' }">{{ $t('form.back') }}</RouterLink>
      </Button>
      <Button type="submit" :disabled="loading">
        <Loader2 v-if="loading" class="animate-spin" />
        {{ $t('form.recover') }}
      </Button>
    </div>
  </form>
</template>
