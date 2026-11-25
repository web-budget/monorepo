<script setup lang="ts">
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
import RoleSelectField from '@/components/users/RoleSelectField.vue'
import { sortRoles } from '@/components/users/roles'
import { approveFormSchema } from '@/schemas/userSchema'
import type { UserView } from '@/types'

const props = defineProps<{
  user: UserView | null
  roles: string[]
  loading: boolean
  messages: string[]
}>()

const emit = defineEmits<{ close: []; approve: [user: UserView, roles: string[]] }>()

const { t } = useI18n()

const form = useForm({
  validationSchema: approveFormSchema,
  initialValues: { roles: [] as string[] },
})

const roleOptions = computed(() =>
  sortRoles(props.roles).map((role) => ({
    value: role,
    label: t(`users.role.${role.toLowerCase()}`),
    description: t(`users.role-description.${role.toLowerCase()}`),
  })),
)

watch(
  () => props.user,
  (user) => form.resetForm({ values: { roles: user?.authorities ?? [] } }),
)

const submit = form.handleSubmit((values) => {
  emit('approve', props.user as UserView, values.roles)
})
</script>

<template>
  <Dialog :open="user !== null" @update:open="emit('close')">
    <DialogContent class="sm:max-w-lg">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>{{ $t('users.approve.title', { name: user?.name }) }}</DialogTitle>
          <DialogDescription>
            {{ $t('users.approve.description', { email: user?.email }) }}
          </DialogDescription>
        </DialogHeader>
        <ServerErrorAlert :messages="messages" />
        <RoleSelectField name="roles" :label="$t('users.form.roles')" :options="roleOptions" />
        <DialogFooter>
          <Button type="button" variant="outline" @mousedown.prevent @click="emit('close')">
            {{ $t('form.cancel') }}
          </Button>
          <Button type="submit" :disabled="loading">{{ $t('users.approve.action') }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
