<script setup lang="ts">
import { Plus, Users } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import { MASCULINE_STATUS_OPTIONS } from '@/components/listing/statusOptions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ResetPasswordDialog from '@/components/users/ResetPasswordDialog.vue'
import { sortRoles } from '@/components/users/roles'
import UserAvatar from '@/components/users/UserAvatar.vue'
import UserRowActions from '@/components/users/UserRowActions.vue'
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
  listState,
  busy,
  counts,
  search,
  clearSearch,
  reload,
  onPageChange,
  onTableSorted,
  changeToAdd,
  changeToUpdate,
  remove,
} = useCrudList({
  routeName: 'users',
  entity: 'users',
  initialStatus: 'ALL',
  statuses: MASCULINE_STATUS_OPTIONS.map((option) => option.value),
  pageRequest,
  pageResponse,
  loading,
  findAll: store.findAll,
  count: store.count,
  remove: store.remove,
})

const columns = computed(() => [
  { field: 'name', header: t('users.table-columns.name'), sortable: true },
  { field: 'authorities', header: t('users.table-columns.roles'), wide: true },
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
        :counts="counts"
        @on-filter-change="search()"
        @on-filter-reset="search()"
      />
      <ServerErrorAlert :messages="messages" />
      <ListState
        v-if="listState !== 'table'"
        :kind="listState"
        entity="users"
        :icon="Users"
        :query="pageRequest.filterText"
        :message="loadMessages[0]"
        @create="changeToAdd()"
        @clear="clearSearch()"
        @retry="reload()"
      />
      <ItemsTable
        v-else
        :data="pageResponse.content"
        :total-elements="pageResponse.totalElements"
        :columns="columns"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        @page-changed="onPageChange"
        @table-sorted="onTableSorted"
      >
        <template #cell-name="{ item }">
          <span class="flex items-center gap-3">
            <UserAvatar :name="item.name" />
            <span class="grid min-w-0">
              <span class="font-medium">
                {{ item.name }}
                <span v-if="isOwnAccount(item)" class="text-muted-foreground text-xs font-normal">
                  {{ $t('users.you') }}
                </span>
              </span>
              <span class="text-muted-foreground text-xs font-normal">{{ item.email }}</span>
            </span>
          </span>
        </template>
        <template #cell-authorities="{ item }">
          <span class="flex flex-wrap gap-1">
            <Badge v-for="role in sortRoles(item.authorities)" :key="role" variant="outline">
              {{ $t(`users.role.${role.toLowerCase()}`) }}
            </Badge>
          </span>
        </template>
        <template #actions="{ item }">
          <UserRowActions
            :user="item"
            :own="isOwnAccount(item)"
            @edit="changeToUpdate(item.id)"
            @reset-password="passwordTarget = item"
            @remove="remove(item)"
          />
        </template>
      </ItemsTable>
      <ResetPasswordDialog :user="passwordTarget" @close="passwordTarget = null" />
    </div>
  </PageContainer>
</template>
