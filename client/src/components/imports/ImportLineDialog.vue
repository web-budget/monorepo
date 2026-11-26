<script setup lang="ts">
import { Check, TriangleAlert } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import FilterSelect from '@/components/forms/FilterSelect.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import ImportLineBadges from '@/components/imports/ImportLineBadges.vue'
import ImportLineValue from '@/components/imports/ImportLineValue.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useServerErrors } from '@/composables/useServerErrors'
import { useImportsStore } from '@/stores/imports'
import type {
  ClassificationListView,
  CostCenterListView,
  ImportAction,
  ImportCandidateView,
  ImportLineUpdateForm,
  ImportLineView,
  WalletListView,
} from '@/types'
import { isIncoming, LINKING_ACTIONS } from '@/utils/imports'
import { dayAndMonth, periodMonth } from '@/utils/invoices'

const props = defineProps<{
  importId: string
  periodId: string
  line: ImportLineView | null
  costCenters: CostCenterListView[]
  classifications: ClassificationListView[]
  wallets: WalletListView[]
}>()

const emit = defineEmits<{ close: [changed: boolean] }>()

const { t, n } = useI18n()
const store = useImportsStore()
const errors = useServerErrors()

const working = ref<ImportLineView | null>(null)
const candidates = ref<ImportCandidateView[]>([])
const changed = ref(false)
const name = ref('')
const costCenter = ref('')
const classification = ref('')
const wallet = ref('')
const link = ref('')
const installment = ref('')
const installments = ref('')

const action = computed(() => working.value?.action)
const linking = computed(() => action.value !== undefined && LINKING_ACTIONS.includes(action.value))
const actionOptions = computed(() =>
  working.value!.allowedActions.map((value) => ({
    value,
    label: t(`imports.draft.actions.${value}`),
  })),
)
const costCenterOptions = computed(() =>
  props.costCenters.map((item) => ({ value: item.id, label: item.name })),
)
const classificationOptions = computed(() => {
  const type = isIncoming(working.value!) ? 'INCOME' : 'EXPENSE'
  return props.classifications
    .filter((item) => item.type === type)
    .map((item) => ({ value: item.id, label: item.name }))
})
const walletOptions = computed(() =>
  props.wallets.map((item) => ({ value: item.id, label: item.name })),
)
const linkOptions = computed(() => {
  const own = working.value?.link
  const list =
    own && !candidates.value.some((item) => key(item) === key(own))
      ? [own, ...candidates.value]
      : candidates.value
  return list.map((item) => ({ value: key(item), label: describe(item) }))
})
const chosen = computed(() => {
  const own = working.value?.link
  return [...candidates.value, ...(own ? [own] : [])].find((item) => key(item) === link.value)
})
const chosenSource = computed(() =>
  chosen.value?.costCenter && chosen.value.classification
    ? `${chosen.value.costCenter.name} · ${chosen.value.classification.name}`
    : '',
)
const linkLabel = computed(() => t(`imports.draft.fields.link.${action.value}`))

function key(candidate: Pick<ImportCandidateView, 'kind' | 'id'>) {
  return `${candidate.kind}:${candidate.id}`
}

function describe(candidate: ImportCandidateView) {
  const period = candidate.financialPeriod
  const other = period && period.id !== props.periodId ? ` · ${periodMonth(period.name)}` : ''
  return `${candidate.name} · ${n(candidate.value, 'currency')}${other}`
}

function fill(line: ImportLineView) {
  working.value = line
  name.value = line.name
  costCenter.value = line.costCenter?.id ?? ''
  classification.value = line.classification?.id ?? ''
  wallet.value = line.wallet?.id ?? ''
  link.value = line.link ? key(line.link) : ''
  installment.value = line.installment ? String(line.installment) : ''
  installments.value = line.installments ? String(line.installments) : ''
}

async function loadCandidates() {
  candidates.value = []
  if (linking.value) {
    await errors.run(async () => {
      candidates.value = await store.candidates(props.importId, working.value!.id)
    })
  }
}

watch(
  () => props.line,
  async (line) => {
    errors.clear()
    changed.value = false
    if (line) {
      fill(line)
      await loadCandidates()
    }
  },
  { immediate: true },
)

async function changeAction(value: string) {
  if (value === '' || value === action.value) {
    return
  }
  const saved = await errors.run(async () => {
    fill(
      await store.updateLine(props.importId, working.value!.id, { action: value as ImportAction }),
    )
  })
  if (saved) {
    changed.value = true
    await loadCandidates()
  }
}

function payload(): ImportLineUpdateForm {
  const form: ImportLineUpdateForm = { name: name.value.trim() || undefined }
  if (action.value === 'CREATE' || action.value === 'CREATE_RECURRING') {
    form.costCenter = costCenter.value || undefined
    form.classification = classification.value || undefined
  }
  if (action.value === 'CREATE_RECURRING') {
    form.installment = Number(installment.value) || undefined
    form.installments = Number(installments.value) || undefined
  }
  if (action.value === 'TRANSFER') {
    form.wallet = wallet.value || undefined
  }
  if (linking.value && chosen.value) {
    form.link = { kind: chosen.value.kind, id: chosen.value.id }
  }
  return form
}

async function save() {
  const saved = await errors.run(() =>
    store.updateLine(props.importId, working.value!.id, payload()),
  )
  if (saved) {
    emit('close', true)
  }
}
</script>

<template>
  <Dialog :open="line !== null" @update:open="emit('close', changed)">
    <DialogContent v-if="working" class="sm:max-w-lg" data-slot="line-dialog">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="save()">
        <DialogHeader>
          <div class="flex items-start justify-between gap-3">
            <DialogTitle>
              {{ $t('imports.draft.dialog.title') }}
              {{ dayAndMonth(working.postedOn) }}
            </DialogTitle>
            <ImportLineValue :value="working.value" />
          </div>
          <DialogDescription
            class="text-muted-foreground font-mono text-xs [overflow-wrap:anywhere]"
          >
            {{ working.description }}
          </DialogDescription>
          <ImportLineBadges :line="working" />
        </DialogHeader>
        <ServerErrorAlert :messages="errors.messages.value" />
        <div class="grid gap-4">
          <div class="grid gap-2">
            <Label for="import-line-name">{{ $t('imports.draft.fields.name') }}</Label>
            <Input id="import-line-name" v-model="name" maxlength="150" />
          </div>
          <FilterSelect
            v-if="actionOptions.length > 1"
            :label="$t('imports.draft.fields.action')"
            :options="actionOptions"
            :model-value="working.action"
            @update:model-value="changeAction"
          />
          <div v-if="action === 'CREATE_RECURRING'" class="grid grid-cols-2 gap-3">
            <div class="grid gap-2">
              <Label for="import-line-installment">
                {{ $t('imports.draft.fields.installment') }}
              </Label>
              <Input id="import-line-installment" v-model="installment" type="number" min="1" />
            </div>
            <div class="grid gap-2">
              <Label for="import-line-installments">
                {{ $t('imports.draft.fields.installments') }}
              </Label>
              <Input id="import-line-installments" v-model="installments" type="number" min="1" />
            </div>
          </div>
          <div
            v-if="action === 'CREATE' || action === 'CREATE_RECURRING'"
            class="grid grid-cols-2 gap-3"
          >
            <FilterSelect
              v-model="costCenter"
              :label="$t('imports.draft.fields.cost-center')"
              :none-label="$t('imports.draft.choose')"
              :options="costCenterOptions"
            />
            <FilterSelect
              v-model="classification"
              :label="
                $t(
                  isIncoming(working)
                    ? 'imports.draft.fields.income-classification'
                    : 'imports.draft.fields.classification',
                )
              "
              :none-label="$t('imports.draft.choose')"
              :options="classificationOptions"
            />
          </div>
          <div v-if="linking" class="grid gap-1.5">
            <FilterSelect
              v-model="link"
              :label="linkLabel"
              :none-label="$t('imports.draft.choose')"
              :options="linkOptions"
            />
            <span
              v-if="chosenSource"
              class="text-muted-foreground text-xs"
              data-slot="link-source"
            >
              {{ chosenSource }}
            </span>
          </div>
          <FilterSelect
            v-if="action === 'TRANSFER'"
            v-model="wallet"
            :label="$t('imports.draft.fields.wallet-to')"
            :none-label="$t('imports.draft.choose')"
            :options="walletOptions"
          />
          <p
            v-if="action === 'IGNORE' && working.ignoreReason"
            class="text-muted-foreground text-sm"
            data-slot="ignore-reason"
          >
            {{ $t(`imports.draft.ignored.${working.ignoreReason.code}`, { date: '' }) }}
          </p>
          <Alert v-if="working.differentValue" variant="attention" data-slot="difference-alert">
            <TriangleAlert />
            <AlertTitle>
              {{
                $t('imports.draft.difference-alert.title', {
                  linked: n(working.link!.value, 'currency'),
                  file: n(Math.abs(working.value), 'currency'),
                })
              }}
            </AlertTitle>
            <AlertDescription>{{ $t('imports.draft.difference-alert.text') }}</AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            @mousedown.prevent
            @click="emit('close', changed)"
          >
            {{ $t('form.cancel') }}
          </Button>
          <Button type="submit" :disabled="store.loading">
            <Check />{{ $t('form.save') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
