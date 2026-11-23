<script setup lang="ts">
import { Banknote, Clock, Lock, Undo2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import DateTimeDisplay from '@/components/common/DateTimeDisplay.vue'
import DetailCard from '@/components/common/DetailCard.vue'
import DetailField from '@/components/common/DetailField.vue'
import DetailSection from '@/components/common/DetailSection.vue'
import InvoiceStatusBadge from '@/components/invoices/InvoiceStatusBadge.vue'
import MovementStatusBadge from '@/components/movements/MovementStatusBadge.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import PayMovementDialog from '@/components/movements/PayMovementDialog.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useActiveCards } from '@/composables/useActiveCards'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useCrudDetail } from '@/composables/useCrudDetail'
import { useMovementActions } from '@/composables/useMovementActions'
import { useServerErrors } from '@/composables/useServerErrors'
import { useMovementsStore } from '@/stores/movements'
import type { MovementView } from '@/types'
import { daysOverdue } from '@/utils/movements'

const props = defineProps<{ id: string }>()

const store = useMovementsStore()
const { movement, loading } = storeToRefs(store)

const { messages, changeToUpdate, remove } = useCrudDetail({
  routeName: 'movements',
  entity: 'movement',
  id: () => props.id,
  name: () => movement.value?.name,
  findOne: store.findOne,
  remove: store.remove,
})

const activeWallets = useActiveWallets()
const activeCards = useActiveCards()
const walletErrors = useServerErrors()
const actions = useMovementActions(() => store.findOne(props.id))

onMounted(() =>
  walletErrors.run(async () => {
    await Promise.all([activeWallets.load(), activeCards.load()])
  }),
)

const periodClosed = computed(() => movement.value?.financialPeriod.status === 'CLOSED')
const paidInOpenPeriod = computed(() => movement.value?.status === 'PAID' && !periodClosed.value)
const locked = computed(() => movement.value?.status === 'PAID' || periodClosed.value)
const canPay = computed(() => movement.value?.status === 'OPEN' && !periodClosed.value)
const canUndo = computed(() => paidInOpenPeriod.value)

function openPay() {
  const { id, name, type, value, invoice } = movement.value!
  actions.openPay({ id, name, type, value, invoicePayment: Boolean(invoice) })
}

function signedValue(item: MovementView) {
  return item.type === 'INCOME' ? item.value : -item.value
}
</script>

<template>
  <DetailCard
    :title="movement?.name ?? $t('movement.form.detailing')"
    :messages="[...messages, ...actions.messages.value, ...walletErrors.messages.value]"
    :readonly="locked"
    :hide-edit="Boolean(movement?.invoice)"
    @edit="changeToUpdate"
    @delete="remove"
  >
    <template #extra-actions>
      <Button v-if="canPay" type="button" @click="openPay()">
        <Banknote />{{
          $t(movement!.type === 'INCOME' ? 'movement.actions.receive' : 'movement.actions.pay')
        }}
      </Button>
      <Button
        v-if="canUndo"
        type="button"
        variant="outline"
        @click="actions.undoPayment(movement!)"
      >
        <Undo2 />{{ $t('movement.actions.undo') }}
      </Button>
    </template>
    <template v-if="movement" #badge>
      <MovementStatusBadge
        :status="movement.status"
        :overdue="movement.overdue"
        :due-date="movement.dueDate"
        :on-card="Boolean(movement.payment?.card)"
      />
    </template>
    <template v-if="movement">
      <div class="grid gap-3 border-b p-5 empty:hidden">
        <Alert v-if="paidInOpenPeriod" data-slot="paid-notice">
          <Lock />
          <AlertTitle>{{ $t('movement.notices.paid') }}</AlertTitle>
          <AlertDescription>{{ $t('movement.notices.paid-description') }}</AlertDescription>
        </Alert>
        <Alert v-if="periodClosed" data-slot="closed-notice">
          <Lock />
          <AlertTitle>
            {{ $t('movement.notices.closed', { name: movement.financialPeriod.name }) }}
          </AlertTitle>
          <AlertDescription>{{ $t('movement.notices.closed-description') }}</AlertDescription>
        </Alert>
        <Alert v-if="movement.overdue" variant="attention" data-slot="overdue-notice">
          <Clock />
          <AlertTitle>
            {{
              $t('movement.notices.overdue', {
                date: $d(new Date(`${movement.dueDate}T00:00:00`), 'short'),
              })
            }}
          </AlertTitle>
          <AlertDescription>
            {{
              $t(
                'movement.notices.overdue-description',
                { days: daysOverdue(movement.dueDate) },
                daysOverdue(movement.dueDate),
              )
            }}
          </AlertDescription>
        </Alert>
      </div>
      <DetailSection :title="$t('movement.sections.identification')" columns="md:grid-cols-3">
        <DetailField :label="$t('movement.detail.name')" :value="movement.name" />
        <DetailField :label="$t('movement.detail.type')">
          <Badge :variant="movement.type === 'INCOME' ? 'approved' : 'neutral'">
            {{ $t(`movement.type.${movement.type === 'INCOME' ? 'income' : 'expense'}`) }}
          </Badge>
        </DetailField>
        <DetailField :label="$t('movement.detail.value')">
          <CurrencyDisplay :value="signedValue(movement)" signed />
        </DetailField>
        <DetailField :label="$t('movement.detail.due-date')" mono>
          <DateTimeDisplay fix-time :value="movement.dueDate" />
        </DetailField>
        <DetailField :label="$t('movement.detail.period')" :value="movement.financialPeriod.name" />
        <template v-if="!movement.invoice">
          <DetailField
            :label="$t('movement.detail.cost-center')"
            :value="movement.costCenter?.fullName"
          />
          <DetailField
            :label="$t('movement.detail.classification')"
            :value="movement.classification?.name"
          />
        </template>
        <DetailField
          :label="$t('movement.detail.description')"
          :value="movement.description"
          wide
        />
      </DetailSection>
      <DetailSection
        v-if="movement.invoice"
        :title="$t('movement.sections.invoice')"
        columns="md:grid-cols-3"
      >
        <DetailField
          :label="$t('movement.detail.invoice-card')"
          :value="movement.invoice.card.name"
        />
        <DetailField :label="$t('movement.detail.invoice-status')">
          <InvoiceStatusBadge :status="movement.invoice.status" />
        </DetailField>
        <DetailField :label="$t('movement.detail.invoice')">
          <RouterLink
            :to="`/financial/invoices/${movement.invoice.id}/detail`"
            class="underline underline-offset-2"
          >
            {{ $t('movement.detail.invoice-link') }}
          </RouterLink>
        </DetailField>
      </DetailSection>
      <DetailSection :title="$t('movement.sections.payment')" columns="md:grid-cols-3">
        <template v-if="movement.payment">
          <DetailField :label="$t('movement.detail.paid-on')" mono>
            <DateTimeDisplay fix-time :value="movement.payment.paidOn" />
          </DetailField>
          <DetailField :label="$t('movement.detail.movement-value')">
            <CurrencyDisplay :value="movement.payment.value" />
          </DetailField>
          <DetailField :label="$t('movement.detail.discount')">
            <CurrencyDisplay :value="movement.payment.discount" zero-if-null />
          </DetailField>
          <DetailField :label="$t('movement.detail.value-paid')">
            <CurrencyDisplay :value="movement.payment.valuePaid" />
          </DetailField>
          <DetailField
            :label="$t('movement.detail.method')"
            :value="
              $t(
                movement.payment.card
                  ? 'movement.detail.method-card'
                  : 'movement.detail.method-wallet',
              )
            "
          />
          <DetailField
            :label="
              movement.payment.card ? $t('movement.detail.card') : $t('movement.detail.wallet')
            "
            :value="movement.payment.card?.name ?? movement.payment.wallet?.name"
          />
        </template>
        <p v-else class="text-muted-foreground text-sm">{{ $t('movement.detail.no-payment') }}</p>
      </DetailSection>
    </template>
  </DetailCard>
  <PayMovementDialog
    :movement="actions.payTarget.value"
    :wallets="activeWallets.wallets.value"
    :cards="activeCards.cards.value"
    :loading="loading"
    :balance-of="activeWallets.balanceOf"
    @close="actions.closePay()"
    @pay="actions.pay"
  />
</template>
