<script setup lang="ts">
import { useForm } from 'vee-validate'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotification } from '@/composables/useNotification'
import { profileFormSchema } from '@/schemas/profileSchema'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { showSuccess } = useNotification()

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: profileFormSchema,
  initialValues: { name: auth.session?.name },
})

const submit = handleSubmit(async ({ name }) => {
  try {
    await auth.changeName(name)
  } catch {
    return
  }
  showSuccess('account.profile.saved')
})
</script>

<template>
  <form class="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]" novalidate @submit="submit">
    <div class="min-h-0 overflow-auto p-5 max-md:p-4">
      <div class="grid gap-4">
        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel>{{ $t('account.profile.name') }}</FormLabel>
            <FormControl>
              <Input autocomplete="name" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <div class="grid gap-2">
          <Label for="account-email">{{ $t('account.profile.email') }}</Label>
          <Input id="account-email" :model-value="auth.session?.email" readonly />
        </div>
      </div>
    </div>
    <div class="border-border bg-muted flex justify-end gap-2 border-t px-5 py-3">
      <Button type="submit" :disabled="isSubmitting">{{ $t('account.profile.save') }}</Button>
    </div>
  </form>
</template>
