import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useListFilters } from '@/composables/useListFilters'
import { createPageRequest } from '@/utils/pageRequest'

async function mountWith(location: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/list', component: { render: () => h('div') } }],
  })
  await router.push(location)
  const pageRequest = ref(createPageRequest<string>())
  const onExternalChange = vi.fn<() => void>()
  let writeRoute = () => {}
  const host = defineComponent({
    setup() {
      writeRoute = useListFilters({
        pageRequest,
        initialStatus: 'ACTIVE',
        statuses: ['ACTIVE', 'ALL'],
        sortFields: ['name'],
        onExternalChange,
      }).writeRoute
      return () => h('div')
    },
  })
  mount(host, { global: { plugins: [router] } })
  return { router, pageRequest, onExternalChange, writeRoute: () => writeRoute() }
}

describe('useListFilters', () => {
  it('reads the state from the URL when it starts', async () => {
    const { pageRequest } = await mountWith(
      '/list?filter=x&status=ALL&page=2&size=30&sort=name,asc',
    )

    expect(pageRequest.value).toEqual({
      filterText: 'x',
      status: 'ALL',
      current: 1,
      size: 30,
      direction: 'asc',
      sortField: 'name',
    })
  })

  it('replaces the state kept from an earlier visit with the defaults when the URL is plain', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/list', component: { render: () => h('div') } }],
    })
    await router.push('/list')
    const pageRequest = ref(createPageRequest<string>({ filterText: 'old', current: 4 }))
    mount(
      defineComponent({
        setup() {
          useListFilters({
            pageRequest,
            initialStatus: 'ACTIVE',
            statuses: ['ACTIVE'],
            sortFields: [],
            onExternalChange: () => {},
          })
          return () => h('div')
        },
      }),
      { global: { plugins: [router] } },
    )

    expect(pageRequest.value).toEqual(createPageRequest())
  })

  it('writes the state to the URL with replace, keeping the other parameters', async () => {
    const { router, pageRequest, writeRoute } = await mountWith('/list?from=email')
    const replace = vi.spyOn(router, 'replace')
    const push = vi.spyOn(router, 'push')

    pageRequest.value.status = 'ALL'
    pageRequest.value.current = 1
    writeRoute()
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ from: 'email', status: 'ALL', page: '2' })
    expect(replace).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('does not navigate when the URL already says what the state says', async () => {
    const { router, writeRoute } = await mountWith('/list?status=ALL')
    const replace = vi.spyOn(router, 'replace')

    writeRoute()

    expect(replace).not.toHaveBeenCalled()
  })

  it('cleans a URL with invalid values on the next write', async () => {
    const { router, writeRoute } = await mountWith('/list?status=NOPE&page=zero')

    writeRoute()
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({})
  })

  it('follows a URL that changes from outside and tells the list to reload', async () => {
    const { router, pageRequest, onExternalChange } = await mountWith('/list')

    await router.push('/list?status=ALL&filter=y')
    await flushPromises()

    expect(pageRequest.value).toMatchObject({ status: 'ALL', filterText: 'y' })
    expect(onExternalChange).toHaveBeenCalledTimes(1)
  })

  it('ignores a URL change that only echoes the state it already has', async () => {
    const { router, pageRequest, onExternalChange, writeRoute } = await mountWith('/list')

    pageRequest.value.status = 'ALL'
    writeRoute()
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ status: 'ALL' })
    expect(onExternalChange).not.toHaveBeenCalled()
  })

  it('ignores a change of an unrelated parameter', async () => {
    const { router, onExternalChange } = await mountWith('/list')

    await router.push('/list?from=email')
    await flushPromises()

    expect(onExternalChange).not.toHaveBeenCalled()
  })
})
