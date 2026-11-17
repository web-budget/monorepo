<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from '@/components/forms/FormCard.vue'
import InputField from '@/components/forms/InputField.vue'
import PasswordInput from '@/components/forms/PasswordInput.vue'
import SelectField from '@/components/forms/SelectField.vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
import { Checkbox } from '@/components/ui/checkbox'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import RoleSelectField from '@/components/users/RoleSelectField.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useCrudForm } from '@/composables/useCrudForm'
import {
  LANGUAGES,
  toUserCreateForm,
  toUserFormValues,
  toUserUpdateForm,
  userCreateFormSchema,
  userFormDefaults,
  userUpdateFormSchema,
} from '@/schemas/userSchema'
import { useUsersAdminStore } from '@/stores/usersAdmin'

const props = defineProps<{ id?: string }>()

const { t } = useI18n()

const store = useUsersAdminStore()
const { loading, roles } = storeToRefs(store)
const { confirm } = useConfirmDialog()

const updating = computed(() => props.id !== undefined)

const form = useForm({
  validationSchema: computed(() => (updating.value ? userUpdateFormSchema : userCreateFormSchema)),
  initialValues: userFormDefaults,
})

const { messages, changeToList, onSubmit, run } = useCrudForm({
  routeName: 'users',
  notices: { created: 'notification.user.created', updated: 'notification.user.updated' },
  id: () => props.id,
  form,
  findOne: store.findOne,
  toFormValues: toUserFormValues,
  create: (values) => store.create(toUserCreateForm(values)),
  update: (id, values) => store.update(id, toUserUpdateForm(values)),
  confirm: (isUpdating) =>
    confirm({
      title: t(isUpdating ? 'users.confirm.update-title' : 'users.confirm.create-title'),
      description: t(isUpdating ? 'users.confirm.update' : 'users.confirm.create', {
        name: form.values.name,
      }),
      confirmLabel: t('form.save'),
    }),
})

const languages = computed(() =>
  LANGUAGES.map((language) => ({
    value: language,
    label: t(`users.language.${language.toLowerCase().replace('_', '-')}`),
  })),
)
const roleOptions = computed(() =>
  roles.value.map((role) => ({ value: role, label: t(`users.role.${role.toLowerCase()}`) })),
)

onMounted(() => run(store.findRoles))
</script>

<template>
  <FormCard
    :title="updating ? $t('users.form.editing') : $t('users.form.new')"
    :loading="loading"
    :messages="messages"
    @submit="onSubmit"
    @back="changeToList"
  >
    <StatusToggle v-if="updating" name="active" />
    <div class="grid gap-4 md:grid-cols-2">
      <InputField name="name" :label="$t('users.form.name')" />
      <InputField name="email" :label="$t('users.form.email')" :disabled="updating" />
    </div>
    <FormField v-if="!updating" v-slot="{ componentField }" name="password">
      <FormItem>
        <FormLabel>{{ $t('users.form.password') }}</FormLabel>
        <FormControl>
          <PasswordInput autocomplete="new-password" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <SelectField name="defaultLanguage" :label="$t('users.form.language')" :options="languages" />
    <RoleSelectField name="roles" :label="$t('users.form.roles')" :options="roleOptions" />
    <FormField v-if="!updating" v-slot="{ value, handleChange }" name="sendActivationEmail">
      <FormItem class="flex items-center gap-2">
        <FormControl>
          <Checkbox :model-value="value" @update:model-value="handleChange($event === true)" />
        </FormControl>
        <FormLabel>{{ $t('users.form.send-activation-email') }}</FormLabel>
      </FormItem>
    </FormField>
  </FormCard>
</template>
