<script setup lang="ts">
import {
  ArrowDownToLine,
  ArrowDownLeft,
  ArrowUpFromLine,
  ArrowUpRight,
  History,
  Pencil,
  Trash2,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import CompartmentFormDialog from '@/components/compartments/CompartmentFormDialog.vue'
import CompartmentGoalInfo from '@/components/compartments/CompartmentGoalInfo.vue'
import CompartmentMovementDialog from '@/components/compartments/CompartmentMovementDialog.vue'
import CompartmentTypeBadge from '@/components/compartments/CompartmentTypeBadge.vue'
import DeleteCompartmentDialog from '@/components/compartments/DeleteCompartmentDialog.vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ItemsTable from '@/components/listing/ItemsTable.vue'
import type { ItemsTablePageEvent, ItemsTableSortEvent } from '@/components/listing/itemsTable'
import ListState from '@/components/listing/ListState.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCompartmentActions } from '@/composables/useCompartmentActions'
import { useListFilters } from '@/composables/useListFilters'
import { useServerErrors } from '@/composables/useServerErrors'
import { useCompartmentsStore } from '@/stores/compartments'
import { useWalletsStore } from '@/stores/wallets'
import type { CompartmentMovementView } from '@/types'
import { typeKey } from '@/utils/typeLabels'

const props = defineProps<{ id: string; compartmentId: string }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const compartmentsStore = useCompartmentsStore()
const { compartment, compartments, pageRequest, pageResponse, loading } =
  storeToRefs(compartmentsStore)
const walletsStore = useWalletsStore()
const { wallet } = storeToRefs(walletsStore)

const loadErrors = useServerErrors()
const highlighted = ref<Record<string, string>>({})

const filters = useListFilters({
  pageRequest,
  initialStatus: 'ALL' as const,
  statuses: ['ALL'] as const,
  sortFields: ['createdOn', 'value'],
  extra: { keys: ['movement'], values: highlighted },
  onExternalChange: reloadMovements,
})

const walletActive = computed(() => wallet.value?.active ?? false)

function reloadMovements() {
  return loadErrors.run(() => compartmentsStore.findMovements(props.id, props.compartmentId))
}

async function reload() {
  await loadErrors.run(() =>
    Promise.all([
      compartmentsStore.findOne(props.id, props.compartmentId),
      compartmentsStore.findAll(props.id),
      walletsStore.findOne(props.id),
      compartmentsStore.findMovements(props.id, props.compartmentId),
    ]),
  )
}

const actions = useCompartmentActions({
  walletId: () => props.id,
  walletName: () => wallet.value!.name,
  reload,
  onRemoved: () => router.push({ name: 'wallets.detail', params: { id: props.id } }),
})

async function load() {
  await loadErrors.run(async () => {
    await Promise.all([
      compartmentsStore.findOne(props.id, props.compartmentId),
      compartmentsStore.findAll(props.id),
      walletsStore.findOne(props.id),
    ])
    const movement = highlighted.value.movement
    if (movement && !route.query.page) {
      const sort = `${pageRequest.value.sortField},${pageRequest.value.direction}`
      const position = await compartmentsStore.findPosition(
        props.id,
        props.compartmentId,
        movement,
        sort,
      )
      pageRequest.value.current = Math.floor(position / pageRequest.value.size)
    }
    filters.writeRoute()
    await compartmentsStore.findMovements(props.id, props.compartmentId)
  })
}

onMounted(load)

function onPageChange(event: ItemsTablePageEvent) {
  pageRequest.value.current = event.currentPage
  pageRequest.value.size = event.pageSize
  filters.writeRoute()
  return reloadMovements()
}

function onTableSorted(event: ItemsTableSortEvent) {
  pageRequest.value.sortField = event.sortField
  pageRequest.value.direction = event.sortOrder
  pageRequest.value.current = 0
  filters.writeRoute()
  return reloadMovements()
}

function openEntry(movement: CompartmentMovementView) {
  return router.push({
    name: 'statement.detail',
    params: { wallet: props.id, id: movement.entryId },
  })
}

const columns = computed(() => [
  {
    field: 'createdOn',
    header: t('compartment.history.table-columns.created-on'),
    sortable: true,
    mobile: 'title' as const,
  },
  {
    field: 'direction',
    header: t('compartment.history.table-columns.direction'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'value',
    header: t('compartment.history.table-columns.value'),
    sortable: true,
    align: 'end' as const,
    mobile: 'value' as const,
  },
  {
    field: 'note',
    header: t('compartment.history.table-columns.note'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
  {
    field: 'previousBalance',
    header: t('compartment.history.table-columns.previous'),
    align: 'end' as const,
    mobile: 'line' as const,
  },
  {
    field: 'resultingBalance',
    header: t('compartment.history.table-columns.resulting'),
    align: 'end' as const,
    mobile: 'line' as const,
  },
  {
    field: 'origin',
    header: t('compartment.history.table-columns.origin'),
    mobile: 'line' as const,
    mobileLabel: false,
  },
])
</script>

<template>
  <PageContainer>
    <PageHeader :title="compartment?.name ?? $t('compartment.form.detailing')">
      <template #badge>
        <CompartmentTypeBadge v-if="compartment" :type="compartment.type" />
      </template>
      <template #actions>
        <Button
          type="button"
          variant="outline"
          class="text-destructive hover:text-destructive"
          :disabled="!walletActive"
          @click="compartment && actions.openRemove(compartment.id)"
        >
          <Trash2 />{{ $t('compartment.actions.remove') }}
        </Button>
        <Button
          type="button"
          :disabled="!walletActive"
          @click="compartment && actions.openEdit(compartment.id)"
        >
          <Pencil />{{ $t('compartment.actions.edit') }}
        </Button>
      </template>
    </PageHeader>
    <ServerErrorAlert :messages="loadErrors.messages.value" />
    <Card v-if="compartment" class="gap-0 py-0">
      <DetailSection :title="$t('compartment.history.sections-balance')" columns="md:grid-cols-3">
        <DetailField :label="$t('compartment.history.balance')">
          <CurrencyDisplay :value="compartment.balance" class="text-xl font-semibold" />
        </DetailField>
        <DetailField :label="$t('compartment.history.wallet')">
          <RouterLink
            :to="{ name: 'wallets.detail', params: { id } }"
            class="text-primary underline-offset-4 hover:underline"
            >{{ wallet?.name }}</RouterLink
          >
        </DetailField>
        <DetailField
          :label="$t('compartment.history.type')"
          :value="$t(typeKey('compartment', compartment.type))"
        />
      </DetailSection>
      <DetailSection
        v-if="compartment.type === 'GOAL'"
        :title="$t('compartment.history.sections-goal')"
        columns="md:grid-cols-3"
      >
        <DetailField
          :label="$t('compartment.history.description')"
          :value="compartment.description"
          wide
        />
        <DetailField :label="$t('compartment.history.target-value')" mono>
          <CurrencyDisplay v-if="compartment.targetValue" :value="compartment.targetValue" bare />
          <template v-else>---</template>
        </DetailField>
        <DetailField :label="$t('compartment.history.target-date')" mono>
          <DateTimeDisplay v-if="compartment.targetDate" :value="compartment.targetDate" fix-time />
          <template v-else>---</template>
        </DetailField>
        <DetailField
          v-if="compartment.targetValue"
          :label="$t('compartment.history.progress')"
          wide
        >
          <div class="max-w-xl"><CompartmentGoalInfo :compartment="compartment" /></div>
        </DetailField>
      </DetailSection>
      <div class="bg-muted flex flex-wrap items-center justify-end gap-2 rounded-b-lg px-5 py-3">
        <Button
          type="button"
          variant="outline"
          :disabled="!walletActive"
          @click="actions.openMovement('DEPOSIT', compartment.id)"
        >
          <ArrowDownToLine />{{ $t('compartment.actions.deposit') }}
        </Button>
        <Button
          type="button"
          variant="outline"
          :disabled="!walletActive"
          @click="actions.openMovement('WITHDRAWAL', compartment.id)"
        >
          <ArrowUpFromLine />{{ $t('compartment.actions.withdraw') }}
        </Button>
      </div>
    </Card>
    <h2 class="text-base font-semibold">{{ $t('compartment.history.movements') }}</h2>
    <ListState
      v-if="pageResponse.totalElements === 0 && !loading"
      kind="empty"
      entity="compartment"
      :icon="History"
      :copy="{ emptyTitle: $t('compartment.history.empty-title') }"
      :creatable="false"
    />
    <ItemsTable
      v-else
      active-sort-icon-only
      :show-status="false"
      :data="pageResponse.content"
      :total-elements="pageResponse.totalElements"
      :noun="$t('compartment.history.noun', pageResponse.totalElements)"
      :columns="columns"
      :loading="loading"
      :current-page="pageRequest.current"
      :page-size="pageRequest.size"
      :sorted-field="pageRequest.sortField"
      :sorted-order="pageRequest.direction"
      :marked-row="(item: CompartmentMovementView) => item.id === highlighted.movement"
      @page-changed="onPageChange"
      @table-sorted="onTableSorted"
    >
      <template #cell-createdOn="{ item }">
        <DateTimeDisplay :value="item.createdOn" with-time class="font-mono" />
      </template>
      <template #cell-direction="{ item }">
        {{ $t(`compartment.history.${item.direction === 'DEPOSIT' ? 'deposit' : 'withdrawal'}`) }}
      </template>
      <template #cell-value="{ item }">
        <span class="inline-flex items-center gap-1">
          <component
            :is="item.direction === 'DEPOSIT' ? ArrowDownLeft : ArrowUpRight"
            :class="['size-3.5', item.direction === 'DEPOSIT' ? 'text-income' : 'text-expense']"
          />
          <CurrencyDisplay
            :value="item.value"
            bare
            :tone="item.direction === 'DEPOSIT' ? 'income' : 'expense'"
          />
        </span>
      </template>
      <template #cell-note="{ item }">{{ item.note || '—' }}</template>
      <template #cell-previousBalance="{ item }">
        <CurrencyDisplay
          :value="item.previousBalance"
          :signed="item.previousBalance < 0"
          bare
          glued
        />
      </template>
      <template #cell-resultingBalance="{ item }">
        <CurrencyDisplay
          :value="item.resultingBalance"
          :signed="item.resultingBalance < 0"
          bare
          glued
        />
      </template>
      <template #cell-origin="{ item }">
        <Button
          v-if="item.entryId"
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="$t('compartment.history.open-entry')"
          @click.stop="openEntry(item)"
        >
          <ArrowUpRight />
        </Button>
      </template>
    </ItemsTable>
  </PageContainer>
  <CompartmentFormDialog
    :open="actions.formOpen.value"
    :compartment="actions.formTarget.value"
    :wallet-name="wallet?.name ?? ''"
    :reset-token="actions.formResetToken.value"
    :loading="loading"
    :messages="actions.formErrors.generalMessages.value"
    :field-errors="actions.formErrors.fieldMessages.value"
    @close="actions.closeForm()"
    @submit="actions.submitForm"
  />
  <DeleteCompartmentDialog
    :compartment="actions.removeTarget.value"
    :wallet-name="wallet?.name ?? ''"
    :loading="loading"
    :messages="actions.removeErrors.messages.value"
    @close="actions.closeRemove()"
    @confirm="actions.confirmRemove()"
    @withdraw-all="actions.withdrawAll()"
  />
  <CompartmentMovementDialog
    :request="actions.movementRequest.value"
    :wallet-name="wallet?.name ?? ''"
    :free-balance="wallet?.currentBalance ?? 0"
    :compartments="compartments"
    :loading="loading"
    :messages="actions.movementErrors.generalMessages.value"
    :field-errors="actions.movementErrors.fieldMessages.value"
    @close="actions.closeMovement()"
    @move="actions.move"
  />
</template>
