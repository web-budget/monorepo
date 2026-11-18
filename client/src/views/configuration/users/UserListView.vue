<script setup lang="ts">
import { KeyRound, Plus } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ActionButtons from '@/components/listing/ActionButtons.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import { Button } from '@/components/ui/button'
import ResetPasswordDialog from '@/components/users/ResetPasswordDialog.vue'
import { useCrudList } from '@/composables/useCrudList'
import { useAuthStore } from '@/stores/auth'
import { useUsersAdminStore } from '@/stores/usersAdmin'
import type { UserView } from '@/types'

const { t } = useI18n()

const auth = useAuthStore()
const store = useUsersAdminStore()
const { pageRequest, pageResponse, loading } = storeToRefs(store)

const passwordTarget = ref<UserView | null>(null)

const {
  messages,
  loadMessages,
  busy,
  search,
  onPageChange,
  onTableSorted,
  changeToAdd,
  changeToUpdate,
  remove,
} = useCrudList({
  routeName: 'users',
  entity: 'users',
  initialStatus: 'ALL',
  pageRequest,
  pageResponse,
  loading,
  findAll: store.findAll,
  remove: store.remove,
})

const columns = computed(() => [
  { field: 'name', header: t('users.table-columns.name'), sortable: true },
  { field: 'email', header: t('users.table-columns.email'), sortable: true },
  { field: 'authorities', header: t('users.table-columns.roles') },
])

function isOwnAccount(user: UserView): boolean {
  return user.email === auth.session?.email
}
</script>

<template>
  <PageContainer class="mt-4 grid gap-5">
    <PageHeader :title="$t('users.title')" :description="$t('users.list.description')">
      <template #actions>
        <Button type="button" @click="changeToAdd()"><Plus />{{ $t('users.form.new') }}</Button>
      </template>
    </PageHeader>
    <div class="grid gap-3">
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        :placeholder="$t('users.search.placeholder')"
        @on-filter-change="search()"
        @on-filter-reset="search()"
      />
      <ServerErrorAlert :messages="[...loadMessages, ...messages]" />
      <ItemsTable
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :columns="columns"
        :loading="busy"
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
              size="icon-sm"
              variant="ghost"
              :aria-label="$t('users.password.action')"
              @click.stop="passwordTarget = item"
            >
              <KeyRound />
            </Button>
            <ActionButtons @on-edit="changeToUpdate(item.id)" @on-delete="remove(item)" />
          </div>
        </template>
      </ItemsTable>
      <ResetPasswordDialog :user="passwordTarget" @close="passwordTarget = null" />
    </div>
  </PageContainer>
</template>
