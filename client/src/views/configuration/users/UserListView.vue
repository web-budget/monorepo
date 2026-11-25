<script setup lang="ts">
import { Plus, UserCheck, Users } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import ListState from '@/components/listing/ListState.vue'
import SearchControls from '@/components/listing/SearchControls.vue'
import { USER_STATUS_OPTIONS } from '@/components/listing/statusOptions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import ApproveUserDialog from '@/components/users/ApproveUserDialog.vue'
import ResetPasswordDialog from '@/components/users/ResetPasswordDialog.vue'
import { sortRoles } from '@/components/users/roles'
import UserAvatar from '@/components/users/UserAvatar.vue'
import UserRowActions from '@/components/users/UserRowActions.vue'
import UserStatusBadge from '@/components/users/UserStatusBadge.vue'
import { useCrudList } from '@/composables/useCrudList'
import { useUserActions } from '@/composables/useUserActions'
import { useAuthStore } from '@/stores/auth'
import { INITIAL_USER_STATUS, useUsersAdminStore } from '@/stores/usersAdmin'
import type { UserView } from '@/types'

const { t } = useI18n()

const auth = useAuthStore()
const store = useUsersAdminStore()
const { pageRequest, pageResponse, loading } = storeToRefs(store)

const passwordTarget = ref<UserView | null>(null)

const {
  messages,
  loadMessages,
  searchSummary,
  listState,
  busy,
  counts,
  loadCounts,
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
  initialStatus: INITIAL_USER_STATUS,
  statuses: USER_STATUS_OPTIONS.map((option) => option.value),
  sortFields: ['name'],
  pageRequest,
  pageResponse,
  loading,
  findAll: store.findAll,
  count: store.count,
  remove: store.remove,
})

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
} = useUserActions(async () => {
  await reload()
  void loadCounts()
})

const columns = computed(() => [
  { field: 'name', header: t('users.table-columns.name'), sortable: true },
  { field: 'authorities', header: t('users.table-columns.roles'), wide: true },
  { field: 'status', header: t('users.table-columns.status') },
  { field: 'totpEnabled', header: t('users.table-columns.totp') },
])

const pendingCount = computed(() => counts.value.PENDING ?? 0)
const showPendingNotice = computed(
  () => pendingCount.value > 0 && pageRequest.value.status !== 'PENDING',
)

const nobodyIsWaiting = computed(
  () =>
    listState.value === 'no-result' &&
    pageRequest.value.status === 'PENDING' &&
    pageRequest.value.filterText === '',
)

function isOwnAccount(user: UserView): boolean {
  return user.email === auth.session?.email
}

function showPending() {
  pageRequest.value.status = 'PENDING'
  return search()
}

onMounted(() => store.findRoles().catch(() => undefined))
</script>

<template>
  <PageContainer class="gap-6">
    <PageHeader :title="$t('users.title')" :description="$t('users.list.description')">
      <template #actions>
        <Button type="button" @click="changeToAdd()"><Plus />{{ $t('form.create') }}</Button>
      </template>
    </PageHeader>
    <div class="grid grid-cols-1 gap-3">
      <SearchControls
        v-model:status="pageRequest.status"
        v-model:filter="pageRequest.filterText"
        :placeholder="$t('users.search.placeholder')"
        :counts="counts"
        :status-options="USER_STATUS_OPTIONS"
        @on-filter-change="search()"
        @on-filter-reset="search()"
      />
      <Alert v-if="showPendingNotice" variant="attention" data-slot="pending-notice">
        <UserCheck />
        <AlertTitle>
          {{ $t('users.pending-notice.title', { count: pendingCount }, pendingCount) }}
        </AlertTitle>
        <AlertDescription class="flex flex-wrap items-center justify-between gap-2">
          {{ $t('users.pending-notice.description') }}
          <Button type="button" variant="outline" size="sm" @click="showPending()">
            {{ $t('users.pending-notice.action') }}
          </Button>
        </AlertDescription>
      </Alert>
      <ServerErrorAlert :messages="[...messages, ...actionMessages]" />
      <Card
        v-if="nobodyIsWaiting"
        class="grid justify-items-center gap-2 px-6 py-14 text-center"
        data-state="no-pending"
        role="status"
      >
        <span class="bg-accent text-accent-foreground grid size-11 place-content-center rounded-md">
          <UserCheck class="size-5" />
        </span>
        <p class="text-base font-semibold">{{ $t('users.no-pending.title') }}</p>
        <p class="text-muted-foreground max-w-sm text-sm">
          {{ $t('users.no-pending.description') }}
        </p>
      </Card>
      <ListState
        v-else-if="listState !== 'table'"
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
        :summary="searchSummary"
        :columns="columns"
        :loading="busy"
        :current-page="pageRequest.current"
        :page-size="pageRequest.size"
        :sorted-field="pageRequest.sortField"
        :sorted-order="pageRequest.direction"
        :show-status="false"
        :marked-row="(user) => user.status === 'PENDING'"
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
          <span v-if="item.authorities.length === 0" class="text-muted-foreground text-xs">
            {{ $t('users.roles-none') }}
          </span>
          <span v-else class="flex flex-wrap gap-1">
            <Badge v-for="role in sortRoles(item.authorities)" :key="role" variant="outline">
              {{ $t(`users.role.${role.toLowerCase()}`) }}
            </Badge>
          </span>
        </template>
        <template #cell-status="{ item }">
          <UserStatusBadge :status="item.status" />
        </template>
        <template #cell-totpEnabled="{ item }">
          <span v-if="item.status === 'PENDING'" class="text-muted-foreground">—</span>
          <Badge v-else variant="neutral" :class="{ 'opacity-70': !item.totpEnabled }">
            {{ $t(item.totpEnabled ? 'users.totp.enabled' : 'users.totp.disabled') }}
          </Badge>
        </template>
        <template #actions="{ item }">
          <UserRowActions
            :user="item"
            :own="isOwnAccount(item)"
            @edit="changeToUpdate(item.id)"
            @approve="openApprove(item)"
            @block="block(item)"
            @unblock="unblock(item)"
            @reset-password="passwordTarget = item"
            @reset-totp="resetTotp(item)"
            @remove="remove(item)"
          />
        </template>
      </ItemsTable>
      <ResetPasswordDialog :user="passwordTarget" @close="passwordTarget = null" />
      <ApproveUserDialog
        :user="approveTarget"
        :roles="store.roles"
        :loading="loading"
        :messages="approveMessages"
        @close="closeApprove()"
        @approve="approve"
      />
    </div>
  </PageContainer>
</template>
