import { watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  buildListQuery,
  parseListQuery,
  sameListQuery,
  sameListState,
  type ListQuerySettings,
  type ListQueryState,
} from '@/utils/listQuery'

interface ListFiltersOptions<S extends string> extends ListQuerySettings<S> {
  pageRequest: Ref<ListQueryState<S>>
  onExternalChange: () => void
}

export function useListFilters<S extends string>(options: ListFiltersOptions<S>) {
  const route = useRoute()
  const router = useRouter()

  function readRoute(): ListQueryState<S> {
    return parseListQuery(route.query, options)
  }

  Object.assign(options.pageRequest.value, readRoute())

  function writeRoute() {
    const query = buildListQuery(route.query, options.pageRequest.value, options.initialStatus)
    if (!sameListQuery(query, route.query)) {
      void router.replace({ query })
    }
  }

  watch(
    () => route.query,
    () => {
      const fromRoute = readRoute()
      if (sameListState(fromRoute, options.pageRequest.value)) {
        return
      }
      Object.assign(options.pageRequest.value, fromRoute)
      options.onExternalChange()
    },
  )

  return { writeRoute }
}
