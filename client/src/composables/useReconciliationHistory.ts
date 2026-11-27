import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import { useServerErrors } from '@/composables/useServerErrors'
import { useStatementStore } from '@/stores/statement'
import type { ReconciliationView } from '@/types'
import { DEFAULT_PAGE_SIZE } from '@/utils/pageRequest'
import {
  buildHistoryQuery,
  historySignature,
  RECONCILIATION_ROW_PREFIX,
  parseHistoryQuery,
} from '@/utils/reconciliationHistory'

export function useReconciliationHistory(walletId: () => string) {
  const route = useRoute()
  const router = useRouter()
  const store = useStatementStore()
  const errors = useServerErrors()
  const walletPath = route.path

  const reconciliations = ref<ReconciliationView[]>([])
  const total = ref(0)
  const current = ref(0)
  const size = ref(DEFAULT_PAGE_SIZE)
  const selectedId = ref('')
  const loading = ref(false)
  const failed = ref(false)
  let knownSignature = historySignature(route.query)

  async function pageOfSelected(): Promise<number> {
    try {
      const position = await store.findReconciliationPosition(walletId(), selectedId.value)
      return Math.floor(position / size.value)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        selectedId.value = ''
        return 0
      }
      throw error
    }
  }

  async function fetchPage() {
    const page = await store.findReconciliations(walletId(), current.value, size.value)
    reconciliations.value = page.content
    total.value = page.page.totalElements
  }

  function writeRoute() {
    const query = buildHistoryQuery(route.query, {
      reconciliation: selectedId.value,
      current: current.value,
      size: size.value,
    })
    knownSignature = historySignature(query)
    if (historySignature(route.query) !== knownSignature) {
      void router.replace({ query })
    }
  }

  async function scrollToSelected() {
    await nextTick()
    document.getElementById(`${RECONCILIATION_ROW_PREFIX}${selectedId.value}`)?.scrollIntoView({
      block: 'center',
    })
  }

  async function track(action: () => Promise<unknown>) {
    loading.value = true
    failed.value = !(await errors.run(action))
    loading.value = false
  }

  async function load() {
    knownSignature = historySignature(route.query)
    const query = parseHistoryQuery(route.query)
    selectedId.value = query.reconciliation
    size.value = query.size
    current.value = query.page ?? 0
    await track(async () => {
      if (query.reconciliation !== '' && query.page === null) {
        current.value = await pageOfSelected()
      }
      await fetchPage()
    })
    writeRoute()
    await scrollToSelected()
  }

  async function change(event: { currentPage: number; pageSize: number }) {
    current.value = event.currentPage
    size.value = event.pageSize
    await track(fetchPage)
    writeRoute()
  }

  async function restart() {
    selectedId.value = ''
    current.value = 0
    await track(fetchPage)
    writeRoute()
  }

  onMounted(load)

  watch(walletId, load)

  watch(
    () => route.query,
    (query) => {
      if (route.path === walletPath && historySignature(query) !== knownSignature) {
        void load()
      }
    },
  )

  return {
    reconciliations,
    total,
    current,
    size,
    selectedId,
    loading,
    failed,
    messages: errors.messages,
    change,
    restart,
  }
}
