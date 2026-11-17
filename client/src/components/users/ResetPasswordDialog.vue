<script setup lang="ts">
import { useForm } from 'vee-validate'
import { watch } from 'vue'
import PasswordInput from '@/components/forms/PasswordInput.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { userPasswordFormSchema } from '@/schemas/userSchema'
import { useUsersAdminStore } from '@/stores/usersAdmin'
import type { UserView } from '@/types'

const props = defineProps<{ user: UserView | null }>()

const emit = defineEmits<{ close: [] }>()

const store = useUsersAdminStore()
const { showSuccess } = useNotification()
const { messages, run } = useServerErrors()

const form = useForm({ validationSchema: userPasswordFormSchema })

watch(
  () => props.user,
  () => {
    form.resetForm()
    messages.value = []
  },
)

const onSubmit = form.handleSubmit(async (values) => {
  const user = props.user as UserView
  const updated = await run(() =>
    store.updatePassword(user.id, { temporary: true, password: values.password }),
  )
  if (updated) {
    showSuccess('notification.record-updated', 'notification.user.password-reset')
    emit('close')
  }
})
</script>

<template>
  <Dialog :open="user !== null" @update:open="emit('close')">
    <DialogContent>
      <form class="flex flex-col gap-4" novalidate @submit.prevent="onSubmit">
        <DialogHeader>
          <DialogTitle>{{ $t('users.password.title') }}</DialogTitle>
          <DialogDescription>
            {{ $t('users.password.description', { name: user?.name }) }}
          </DialogDescription>
        </DialogHeader>
        <ServerErrorAlert :messages="messages" />
        <FormField v-slot="{ componentField }" name="password">
          <FormItem>
            <FormLabel>{{ $t('users.password.password') }}</FormLabel>
            <FormControl>
              <PasswordInput autocomplete="new-password" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="confirmation">
          <FormItem>
            <FormLabel>{{ $t('users.password.confirmation') }}</FormLabel>
            <FormControl>
              <PasswordInput autocomplete="new-password" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <DialogFooter>
          <Button type="button" variant="outline" @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="submit" :disabled="store.loading">{{ $t('users.password.submit') }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
