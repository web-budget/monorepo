<script setup lang="ts">
import { KeyRound } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ActionButtons from '@/components/listing/ActionButtons.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import ResetPasswordDialog from '@/components/users/ResetPasswordDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useCrudList } from '@/composables/useCrudList'
import { useAuthStore } from '@/stores/auth'
import { useUsersAdminStore } from '@/stores/usersAdmin'
import type { UserView } from '@/types'

const { t } = useI18n()

const auth = useAuthStore()
const store = useUsersAdminStore()
const { pageRequest, pageResponse, loading } = storeToRefs(store)
const { confirm } = useConfirmDialog()

const passwordTarget = ref<UserView | null>(null)

const { messages, reload, onPageChange, onTableSorted, changeToAdd, changeToUpdate, remove } =
  useCrudList({
    routeName: 'users',
    deletedNotice: 'notification.user.deleted',
    pageRequest,
    findAll: store.findAll,
    remove: store.remove,
    confirmRemove: (id) =>
      confirm({
        destructive: true,
        description: t('users.confirm.delete', { name: nameOf(id) }),
      }),
  })

const columns = computed(() => [
  { field: 'name', header: t('users.table-columns.name'), sortable: true },
  { field: 'email', header: t('users.table-columns.email'), sortable: true },
  { field: 'authorities', header: t('users.table-columns.roles') },
])

function nameOf(id: string): string {
  return pageResponse.value.content.find((user) => user.id === id)?.name as string
}

function isOwnAccount(user: UserView): boolean {
  return user.email === auth.session?.email
}
</script>

<template>
  <Card>
    <CardContent class="space-y-6">
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        status-initial-value="ALL"
        :placeholder="$t('users.search.placeholder')"
        @on-new="changeToAdd()"
        @on-filter-change="reload()"
        @on-filter-reset="reload()"
      />
      <ServerErrorAlert :messages="messages" />
      <ItemsTable
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :columns="columns"
        :loading="loading"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
      >
        <template #cell-authorities="{ item }">
          {{ item.authorities.map((role) => $t(`users.role.${role.toLowerCase()}`)).join(', ') }}
        </template>
        <template #actions="{ item }">
          <span v-if="isOwnAccount(item)" class="text-muted-foreground text-sm">
            {{ $t('users.own-account') }}
          </span>
          <div v-else class="flex items-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              :aria-label="$t('users.password.action')"
              @click.stop="passwordTarget = item"
            >
              <KeyRound />
            </Button>
            <ActionButtons @on-edit="changeToUpdate(item.id)" @on-delete="remove(item.id)" />
          </div>
        </template>
      </ItemsTable>
      <ResetPasswordDialog :user="passwordTarget" @close="passwordTarget = null" />
    </CardContent>
  </Card>
</template>
