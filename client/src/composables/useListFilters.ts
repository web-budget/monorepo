import { watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buildListQuery,
  parseExtraQuery,
  parseListQuery,
  sameListQuery,
  sameListState,
  type ExtraQuery,
  type ListQuerySettings,
  type ListQueryState,
} from '@/utils/listQuery'

export interface ExtraFilters {
  keys: readonly string[]
  values: Ref<ExtraQuery>
  sanitize?: (values: ExtraQuery) => ExtraQuery
}

interface ListFiltersOptions<S extends string> extends ListQuerySettings<S> {
  pageRequest: Ref<ListQueryState<S>>
  extra?: ExtraFilters
  onExternalChange: () => void
}

function sameExtra(first: ExtraQuery, second: ExtraQuery, keys: readonly string[]): boolean {
  return keys.every((key) => (first[key] ?? '') === (second[key] ?? ''))
}

export function useListFilters<S extends string>(options: ListFiltersOptions<S>) {
  const route = useRoute()
  const router = useRouter()
  const listPath = route.path
  const extraKeys = options.extra?.keys ?? []

  function readRoute(): ListQueryState<S> {
    return parseListQuery(route.query, options)
  }

  function readExtra(): ExtraQuery {
    const parsed = parseExtraQuery(route.query, extraKeys)
    return options.extra?.sanitize ? options.extra.sanitize(parsed) : parsed
  }

  Object.assign(options.pageRequest.value, readRoute())
  if (options.extra) {
    options.extra.values.value = readExtra()
  }

  function writeRoute() {
    const query = buildListQuery(
      route.query,
      options.pageRequest.value,
      options.initialStatus,
      options.extra?.values.value,
      extraKeys,
      options.defaultSort,
    )
    if (!sameListQuery(query, route.query, extraKeys)) {
      void router.replace({ query })
    }
  }

  watch(
    () => route.query,
    () => {
      if (route.path !== listPath) {
        return
      }
      const fromRoute = readRoute()
      const extraFromRoute = readExtra()
      const sameBase = sameListState(fromRoute, options.pageRequest.value)
      const currentExtra = options.extra?.values.value ?? {}
      if (sameBase && sameExtra(extraFromRoute, currentExtra, extraKeys)) {
        return
      }
      Object.assign(options.pageRequest.value, fromRoute)
      if (options.extra) {
        options.extra.values.value = extraFromRoute
      }
      options.onExternalChange()
    },
  )

  return { writeRoute }
}
