import { computed, ref, type Ref } from 'vue'
import type { PagedResponse, PageQuery } from '@/types'
import {
  createPageResponse,
  toPageQuery,
  type PageRequest,
  type PageResponse,
} from '@/utils/pageRequest'

export interface CrudApi<L, V, C, U> {
  findAll(query: PageQuery): Promise<PagedResponse<L>>
  findById(id: string): Promise<V>
  create(form: C): Promise<void>
  update(id: string, form: U): Promise<V>
  remove(id: string): Promise<void>
}

export function useCrudResource<L extends { id: string }, V, C, U, S extends string>(
  api: CrudApi<L, V, C, U>,
  initialPageRequest: () => PageRequest<S>,
) {
  const pageRequest = ref(initialPageRequest()) as Ref<PageRequest<S>>
  const pageResponse = ref(createPageResponse<L>()) as Ref<PageResponse<L>>
  const current = ref(null) as Ref<V | null>
  const pending = ref(0)
  const loading = computed(() => pending.value > 0)

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
      const { content, page } = await api.findAll(toPageQuery(pageRequest.value))
      pageResponse.value = { content, ...page }
    })
  }

  function findOne(id: string): Promise<V> {
    return track(async () => {
      current.value = null
      current.value = await api.findById(id)
      return current.value
    })
  }

  function create(form: C): Promise<void> {
    return track(() => api.create(form))
  }

  function update(id: string, form: U): Promise<V> {
    return track(async () => {
      current.value = await api.update(id, form)
      return current.value
    })
  }

  function remove(id: string): Promise<void> {
    return track(async () => {
      await api.remove(id)
      const remaining = pageResponse.value.content.filter((row) => row.id !== id)
      const removed = pageResponse.value.content.length - remaining.length
      pageResponse.value = {
        ...pageResponse.value,
        content: remaining,
        totalElements: pageResponse.value.totalElements - removed,
      }
      current.value = null
    })
  }

  function reset() {
    pageRequest.value = initialPageRequest()
    pageResponse.value = createPageResponse<L>()
    current.value = null
  }

  return {
    pageRequest,
    pageResponse,
    current,
    loading,
    track,
    findAll,
    findOne,
    create,
    update,
    remove,
    reset,
  }
}
