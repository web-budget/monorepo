<script setup lang="ts">
import { Check, KeyRound, Lock, LockOpen, ShieldOff, Trash2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import FormCard from '@/components/forms/FormCard.vue'
import FormSection from '@/components/forms/FormSection.vue'
import InputField from '@/components/forms/InputField.vue'
import PasswordInput from '@/components/forms/PasswordInput.vue'
import SelectField from '@/components/forms/SelectField.vue'
import StatusSection from '@/components/forms/StatusSection.vue'
import StatusToggle from '@/components/forms/StatusToggle.vue'
import StatusBadge from '@/components/listing/StatusBadge.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import ApproveUserDialog from '@/components/users/ApproveUserDialog.vue'
import ResetPasswordDialog from '@/components/users/ResetPasswordDialog.vue'
import RoleSelectField from '@/components/users/RoleSelectField.vue'
import { sortRoles } from '@/components/users/roles'
import UserStatusBadge from '@/components/users/UserStatusBadge.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useCrudForm } from '@/composables/useCrudForm'
import { useNotification } from '@/composables/useNotification'
import { useUserActions } from '@/composables/useUserActions'
import {
  LANGUAGES,
  toUserCreateForm,
  toUserFormValues,
  toUserUpdateForm,
  userCreateFormSchema,
  userFormDefaults,
  userUpdateFormSchema,
} from '@/schemas/userSchema'
import { useAuthStore } from '@/stores/auth'
import { useUsersAdminStore } from '@/stores/usersAdmin'
import type { UserView } from '@/types'

const props = defineProps<{ id?: string }>()

const { t } = useI18n()

const auth = useAuthStore()
const store = useUsersAdminStore()
const { roles, user } = storeToRefs(store)
const { confirm, confirmRemoval } = useConfirmDialog()
const { showSuccess } = useNotification()

const updating = computed(() => props.id !== undefined)
const loadedUser = computed(() => (user.value?.id === props.id ? user.value : null))
const ownAccount = computed(() => loadedUser.value?.email === auth.session?.email)
const passwordTarget = ref<UserView | null>(null)

const form = useForm({
  validationSchema: computed(() => (updating.value ? userUpdateFormSchema : userCreateFormSchema)),
  initialValues: userFormDefaults,
})

const { messages, fields, submitting, loadingRecord, dirty, changeToList, onSubmit, run } =
  useCrudForm({
    routeName: 'users',
    entity: 'users',
    id: () => props.id,
    form,
    findOne: store.findOne,
    toFormValues: toUserFormValues,
    create: (values) => store.create(toUserCreateForm(values)),
    update: (id, values) => store.update(id, toUserUpdateForm(values)),
    confirm: (isUpdating) => {
      const kind = isUpdating ? 'update' : 'create'
      return confirm({
        title: t(`users.confirm.${kind}-title`, { name: form.values.name }),
        description: t(`users.confirm.${kind}`),
        confirmLabel: t(`users.confirm.${kind}-label`),
      })
    },
  })

const languages = computed(() =>
  LANGUAGES.map((language) => ({
    value: language,
    label: t(`users.language.${language.toLowerCase().replace('_', '-')}`),
  })),
)
const roleOptions = computed(() =>
  sortRoles(roles.value).map((role) => ({
    value: role,
    label: t(`users.role.${role.toLowerCase()}`),
    description: t(`users.role-description.${role.toLowerCase()}`),
  })),
)

async function removeUser(target: UserView) {
  if (!(await confirmRemoval('users', target.name))) {
    return
  }
  if (await run(() => store.remove(target.id))) {
    showSuccess('users.toast.removed', 'users.toast.removed-detail', true, { name: target.name })
    form.resetForm({ values: form.values })
    await changeToList()
  }
}

const {
  messages: actionMessages,
  approveTarget,
  approveMessages,
  openApprove,
  closeApprove,
  approve,
  block,
  unblock,
  resetTotp,
} = useUserActions(() => store.findOne(props.id as string).then(() => undefined))

onMounted(() => run(store.findRoles))
</script>

<template>
  <FormCard
    :title="
      updating ? (loadedUser?.name ?? $t('users.form.title-editing')) : $t('users.form.title-new')
    "
    :description="updating ? loadedUser?.email : undefined"
    :loading="loadingRecord"
    :submitting="submitting"
    :dirty="dirty"
    :messages="[...messages, ...actionMessages]"
    :fields="fields"
    :submit-label="updating ? $t('form.save') : $t('form.create')"
    @submit="onSubmit"
    @back="changeToList"
  >
    <template v-if="loadedUser" #badge>
      <StatusBadge :active="loadedUser.active" />
    </template>

    <StatusSection
      v-if="updating"
      name="active"
      :label="$t('users.form.active-label')"
      :hint="$t('users.form.active-hint')"
    />

    <FormSection
      :title="$t('users.sections.data')"
      :description="updating ? undefined : $t('users.sections.data-help')"
      :stacked="updating"
    >
      <InputField name="name" :label="$t('users.form.name')" required />
      <InputField
        name="email"
        :label="$t('users.form.email')"
        :disabled="updating"
        :hint="updating ? $t('users.form.email-hint') : undefined"
        :required="!updating"
      />
      <SelectField name="defaultLanguage" :label="$t('users.form.language')" :options="languages" />
    </FormSection>

    <FormSection
      v-if="!updating"
      :title="$t('users.sections.access')"
      :description="$t('users.sections.access-help')"
    >
      <FormField v-slot="{ componentField }" name="password">
        <FormItem>
          <FormLabel required>{{ $t('users.form.password') }}</FormLabel>
          <FormControl>
            <PasswordInput autocomplete="new-password" v-bind="componentField" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <StatusToggle
        name="sendActivationEmail"
        class="md:col-span-1"
        :heading="$t('users.form.activation-heading')"
        :label="$t('users.form.send-activation-email')"
        :hint="$t('users.form.activation-hint')"
      />
    </FormSection>

    <FormSection
      :title="$t('users.sections.roles')"
      :description="updating ? undefined : $t('users.sections.roles-help')"
      :stacked="updating"
    >
      <RoleSelectField name="roles" :label="$t('users.form.roles')" :options="roleOptions" />
    </FormSection>

    <template v-if="loadedUser" #aside>
      <Card class="gap-0 divide-y py-0">
        <div class="grid gap-2 p-4">
          <p class="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            {{ $t('users.aside.title') }}
          </p>
          <dl class="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-2 text-sm">
            <dt class="text-muted-foreground">{{ $t('users.aside.status') }}</dt>
            <dd class="text-right"><StatusBadge :active="loadedUser.active" /></dd>
            <dt class="text-muted-foreground">{{ $t('users.aside.approval') }}</dt>
            <dd class="text-right"><UserStatusBadge :status="loadedUser.status" /></dd>
            <dt class="text-muted-foreground">{{ $t('users.aside.totp') }}</dt>
            <dd class="text-right">
              {{ $t(loadedUser.totpEnabled ? 'users.totp.enabled' : 'users.totp.disabled') }}
            </dd>
            <dt class="text-muted-foreground">{{ $t('users.aside.language') }}</dt>
            <dd class="text-right">
              {{
                $t(`users.language.${loadedUser.defaultLanguage.toLowerCase().replace('_', '-')}`)
              }}
            </dd>
            <dt class="text-muted-foreground">{{ $t('users.aside.roles') }}</dt>
            <dd class="flex flex-wrap justify-end gap-1">
              <Badge
                v-for="role in sortRoles(loadedUser.authorities)"
                :key="role"
                variant="outline"
              >
                {{ $t(`users.role.${role.toLowerCase()}`) }}
              </Badge>
            </dd>
          </dl>
        </div>
        <div class="grid gap-1 p-2">
          <Button
            v-if="loadedUser.status === 'PENDING'"
            type="button"
            variant="ghost"
            class="justify-start"
            @click="openApprove(loadedUser)"
          >
            <Check />{{ $t('users.approve.shortcut') }}
          </Button>
          <Button
            type="button"
            variant="ghost"
            class="justify-start"
            :disabled="ownAccount"
            @click="passwordTarget = loadedUser"
          >
            <KeyRound />{{ $t('users.password.action') }}
          </Button>
          <Button
            v-if="loadedUser.totpEnabled"
            type="button"
            variant="ghost"
            class="justify-start"
            :disabled="ownAccount"
            @click="resetTotp(loadedUser)"
          >
            <ShieldOff />{{ $t('users.totp-reset.menu') }}
          </Button>
          <Button
            v-if="loadedUser.status === 'APPROVED'"
            type="button"
            variant="ghost"
            class="justify-start"
            :disabled="ownAccount"
            @click="block(loadedUser)"
          >
            <Lock />{{ $t('users.block.menu') }}
          </Button>
          <Button
            v-if="loadedUser.status === 'BLOCKED'"
            type="button"
            variant="ghost"
            class="justify-start"
            :disabled="ownAccount"
            @click="unblock(loadedUser)"
          >
            <LockOpen />{{ $t('users.unblock.menu') }}
          </Button>
          <Button
            type="button"
            variant="ghost"
            class="text-destructive hover:text-destructive justify-start"
            :disabled="ownAccount"
            @click="removeUser(loadedUser)"
          >
            <Trash2 />{{ $t('users.remove.action') }}
          </Button>
        </div>
      </Card>
    </template>
  </FormCard>
  <ResetPasswordDialog :user="passwordTarget" @close="passwordTarget = null" />
  <ApproveUserDialog
    :user="approveTarget"
    :roles="roles"
    :loading="store.loading"
    :messages="approveMessages"
    @close="closeApprove()"
    @approve="approve"
  />
</template>
