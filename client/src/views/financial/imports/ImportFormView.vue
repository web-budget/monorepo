<script setup lang="ts">
import {
  CircleAlert,
  CreditCard,
  FileCheck,
  FileUp,
  ListChecks,
  Upload,
  Wallet,
  X,
} from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import PageContainer from '@/components/common/PageContainer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import FormSection from '@/components/forms/FormSection.vue'
import SegmentedField from '@/components/forms/SegmentedField.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useActiveCards } from '@/composables/useActiveCards'
import { useActiveWallets } from '@/composables/useActiveWallets'
import { useImportDestinationCheck } from '@/composables/useImportDestinationCheck'
import { useNotification } from '@/composables/useNotification'
import { useOpenPeriods } from '@/composables/useOpenPeriods'
import { useServerErrors } from '@/composables/useServerErrors'
import { importSchema, toImportFormData, type ImportFormValues } from '@/schemas/importSchema'
import { toTypedSchema } from '@/schemas/typedSchema'
import { useImportsStore } from '@/stores/imports'
import type { ImportTarget } from '@/types'
import { destinationName, fileSize } from '@/utils/imports'
import { cardLabel } from '@/utils/invoices'
import { defaultPeriod } from '@/utils/movements'
import { queryValue } from '@/utils/queryValue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useImportsStore()
const { showSuccess } = useNotification()
const activeCards = useActiveCards()
const activeWallets = useActiveWallets()
const openPeriods = useOpenPeriods()
const { messages, run } = useServerErrors()

const fileInput = ref<HTMLInputElement | null>(null)
const submitting = ref(false)

const { values, setFieldValue, handleSubmit } = useForm({
  validationSchema: toTypedSchema(importSchema),
  initialValues: { target: 'CARD' as ImportTarget, card: '', wallet: '', financialPeriod: '' },
})

const destination = {
  target: computed(() => values.target!),
  card: computed(() => values.card!),
  wallet: computed(() => values.wallet!),
  financialPeriod: computed(() => values.financialPeriod!),
}
const { card, wallet, financialPeriod } = destination
const { withoutOpenInvoice, draft } = useImportDestinationCheck(destination)

const isCard = computed(() => destination.target.value === 'CARD')
const file = computed(() => values.file as File | undefined)
const blocked = computed(() => withoutOpenInvoice.value || draft.value !== null || !file.value)

const kinds = [
  { value: 'CARD', label: 'imports.form.kind.card', icon: CreditCard },
  { value: 'WALLET', label: 'imports.form.kind.wallet', icon: Wallet },
]

const cardChoices = computed(() =>
  activeCards.cards.value.map((card) => ({ value: card.id, label: cardLabel(card) })),
)
const walletChoices = computed(() =>
  activeWallets.wallets.value
    .filter((wallet) => wallet.type !== 'PERSONAL')
    .map((wallet) => ({ value: wallet.id, label: wallet.name })),
)
const periodChoices = computed(() =>
  openPeriods.periods.value.map((period) => ({
    value: period.id,
    label: period.expired ? t('imports.form.expired', { name: period.name }) : period.name,
  })),
)
const alertCard = computed(() =>
  cardLabel(activeCards.cards.value.find((candidate) => candidate.id === card.value)!),
)
const alertPeriod = computed(
  () => openPeriods.periods.value.find((candidate) => candidate.id === financialPeriod.value)!.name,
)

onMounted(async () => {
  await run(async () => {
    await Promise.all([openPeriods.load(), activeCards.load(), activeWallets.load()])
  })
  const requestedCard = queryValue(route.query.card)
  const requestedWallet = queryValue(route.query.wallet)
  const requestedPeriod = queryValue(route.query.period)
  setFieldValue('target', 'wallet' in route.query ? 'WALLET' : 'CARD')
  setFieldValue(
    'card',
    activeCards.cards.value.find((card) => card.id === requestedCard)?.id ??
      activeCards.cards.value[0]?.id ??
      '',
  )
  setFieldValue(
    'wallet',
    walletChoices.value.find((wallet) => wallet.value === requestedWallet)?.value ??
      walletChoices.value[0]?.value ??
      '',
  )
  setFieldValue(
    'financialPeriod',
    openPeriods.periods.value.find((period) => period.id === requestedPeriod)?.id ??
      defaultPeriod(openPeriods.periods.value)?.id ??
      '',
  )
})

function pickFile(event: Event) {
  const chosen = (event.target as HTMLInputElement).files?.[0]
  if (chosen) {
    setFieldValue('file', chosen as never)
  }
}

function openPicker() {
  fileInput.value!.click()
}

function clearFile() {
  setFieldValue('file', undefined as never)
  fileInput.value!.value = ''
}

const submit = handleSubmit(async (form) => {
  submitting.value = true
  let id = ''
  const done = await run(async () => {
    id = await store.create(toImportFormData(form as ImportFormValues))
  })
  submitting.value = false
  if (done) {
    showSuccess('imports.toast.sent')
    await router.push({ name: 'imports.detail', params: { id } })
  }
})

function seeInvoices() {
  return router.push({
    name: 'invoices',
    query: { card: card.value, period: financialPeriod.value },
  })
}

function openDraft() {
  return router.push({ name: 'imports.detail', params: { id: draft.value!.id } })
}
</script>

<template>
  <PageContainer>
    <PageHeader :title="$t('imports.form.title')" :description="$t('imports.form.description')" />
    <ServerErrorAlert :messages="messages" />
    <form novalidate @submit.prevent="submit">
      <Card class="gap-0 py-0">
        <div v-if="withoutOpenInvoice || draft" class="grid gap-3 p-5 pb-0">
          <Alert v-if="withoutOpenInvoice" variant="destructive" data-slot="no-invoice">
            <CircleAlert />
            <AlertTitle>
              {{
                $t('imports.form.no-invoice.title', {
                  card: alertCard,
                  period: alertPeriod,
                })
              }}
            </AlertTitle>
            <AlertDescription class="text-foreground">
              {{ $t('imports.form.no-invoice.text') }}
              <div class="mt-1.5">
                <Button type="button" variant="outline" size="sm" @click="seeInvoices()">
                  <CreditCard />{{ $t('imports.form.no-invoice.action') }}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
          <Alert v-else-if="draft" variant="destructive" data-slot="draft-exists">
            <CircleAlert />
            <AlertTitle>
              {{
                $t('imports.form.draft.title', {
                  kind: $t(`imports.form.draft.kind.${draft.status}`),
                  destination: destinationName(draft),
                  period: draft.financialPeriod.name,
                })
              }}
            </AlertTitle>
            <AlertDescription class="text-foreground">
              {{ $t('imports.form.draft.text') }}
              <div class="mt-1.5">
                <Button type="button" variant="outline" size="sm" @click="openDraft()">
                  <ListChecks />{{ $t('imports.form.draft.action') }}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
        <fieldset :disabled="submitting" class="min-w-0">
          <FormSection :title="$t('imports.form.destination')">
            <div class="grid gap-4 md:col-span-2">
              <SegmentedField
                name="target"
                :options="kinds.map((kind) => ({ ...kind, label: $t(kind.label) }))"
              />
              <div class="grid gap-4 md:grid-cols-2">
                <FilterSelect
                  v-if="isCard"
                  :model-value="card"
                  :label="$t('imports.form.card')"
                  required
                  :options="cardChoices"
                  @update:model-value="(value: string) => setFieldValue('card', value)"
                />
                <FilterSelect
                  v-else
                  :model-value="wallet"
                  :label="$t('imports.form.wallet')"
                  required
                  :options="walletChoices"
                  @update:model-value="(value: string) => setFieldValue('wallet', value)"
                />
                <FilterSelect
                  :model-value="financialPeriod"
                  :label="$t('imports.form.period')"
                  required
                  :options="periodChoices"
                  @update:model-value="(value: string) => setFieldValue('financialPeriod', value)"
                />
              </div>
            </div>
          </FormSection>
          <FormSection :title="$t('imports.form.file')">
            <div class="grid gap-2 md:col-span-2">
              <div
                v-if="file"
                class="border-border bg-card flex items-center gap-3 rounded-md border px-3 py-2.5"
                data-slot="chosen-file"
              >
                <FileCheck class="text-primary size-5" />
                <div class="grid min-w-0 flex-1">
                  <span class="truncate font-medium">{{ file.name }}</span>
                  <span class="text-muted-foreground text-xs">
                    {{ $t('imports.form.file-info', { size: fileSize(file.size) }) }}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  :aria-label="$t('imports.form.replace-file')"
                  @click="clearFile()"
                >
                  <X />
                </Button>
              </div>
              <button
                v-else
                type="button"
                class="border-input bg-muted/50 hover:bg-accent/50 grid w-full cursor-pointer justify-items-center gap-2 rounded-md border border-dashed px-6 py-10 text-center"
                data-slot="drop-area"
                @click="openPicker()"
              >
                <FileUp class="text-muted-foreground size-6" />
                <span class="font-medium">{{ $t('imports.form.drop') }}</span>
                <span class="text-muted-foreground text-sm">{{ $t('imports.form.only-ofx') }}</span>
              </button>
              <input
                ref="fileInput"
                type="file"
                accept=".ofx"
                class="sr-only"
                tabindex="-1"
                data-slot="file-input"
                @change="pickFile"
              />
            </div>
          </FormSection>
        </fieldset>
        <div
          class="bg-muted sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-b-lg px-5 py-3"
        >
          <span />
          <div class="flex gap-2">
            <Button type="button" variant="outline" @click="router.push({ name: 'imports' })">
              {{ $t('form.cancel') }}
            </Button>
            <Button type="submit" :disabled="blocked || submitting">
              <Upload />{{ $t('imports.form.send') }}
            </Button>
          </div>
        </div>
      </Card>
    </form>
  </PageContainer>
</template>
