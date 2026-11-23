import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { recurringMovementsApi } from '@/api/recurringMovements'
import type { RecurringLaunchReport, RecurringMovementView } from '@/types'
import type { ExtraQuery } from '@/utils/listQuery'
import {
  createPageRequest,
  createPageResponse,
  toPageQuery,
  type PageResponse,
} from '@/utils/pageRequest'
import { displayedValue } from '@/utils/recurringMovements'

export const RECURRING_LAUNCH_FILTER_KEYS = ['period']

export function launchValueOf(
  recurringMovement: RecurringMovementView,
  typed: number | null | undefined,
): number {
  return recurringMovement.valueKind === 'VARIABLE'
    ? (typed ?? displayedValue(recurringMovement))
    : recurringMovement.value
}

export const useRecurringLaunchStore = defineStore('recurringLaunch', () => {
  const filters = ref<ExtraQuery>({})
  const pageRequest = ref(createPageRequest<string>({ status: 'ALL' }))
  const pageResponse = ref<PageResponse<RecurringMovementView>>(createPageResponse())
  const typedValues = ref<Record<string, number | null>>({})
  const selection = ref<Record<string, RecurringMovementView>>({})
  const pending = ref(0)
  const loading = computed(() => pending.value > 0)

  const selected = computed(() => Object.values(selection.value))
  const effect = computed(() =>
    selected.value.reduce((total, recurringMovement) => {
      const value = launchValueOf(recurringMovement, typedValues.value[recurringMovement.id])
      return total + (recurringMovement.type === 'INCOME' ? value : -value)
    }, 0),
  )

  async function track<T>(operation: () => Promise<T>): Promise<T> {
    pending.value++
    try {
      return await operation()
    } finally {
      pending.value--
    }
  }

  function findAll(): Promise<void> {
    return track(async () => {
      const query = toPageQuery(pageRequest.value)
      const { content, page } = await recurringMovementsApi.findAll({
        active: true,
        finished: false,
        financialPeriod: filters.value.period || undefined,
        page: query.page,
        size: query.size,
        sort: query.sort,
      })
      pageResponse.value = { content, ...page }
    })
  }

  function toggle(recurringMovement: RecurringMovementView, checked: boolean) {
    const next = { ...selection.value }
    if (checked) {
      next[recurringMovement.id] = recurringMovement
    } else {
      delete next[recurringMovement.id]
    }
    selection.value = next
  }

  function type(id: string, value: number | null) {
    typedValues.value = { ...typedValues.value, [id]: value }
  }

  function launch(financialPeriod: string): Promise<RecurringLaunchReport> {
    return track(() =>
      recurringMovementsApi.launch(
        financialPeriod,
        selected.value.map((recurringMovement) =>
          recurringMovement.valueKind === 'VARIABLE'
            ? {
                id: recurringMovement.id,
                value: launchValueOf(recurringMovement, typedValues.value[recurringMovement.id]),
              }
            : { id: recurringMovement.id },
        ),
      ),
    )
  }

  function clearSelection() {
    selection.value = {}
    typedValues.value = {}
  }

  function reset() {
    filters.value = {}
    pageRequest.value = createPageRequest<string>({ status: 'ALL' })
    pageResponse.value = createPageResponse()
    clearSelection()
  }

  return {
    filters,
    pageRequest,
    pageResponse,
    typedValues,
    selection,
    selected,
    effect,
    loading,
    findAll,
    toggle,
    type,
    launch,
    clearSelection,
    reset,
  }
})
