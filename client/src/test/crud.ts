import { flushPromises, mount } from '@vue/test-utils'
import type { Mock } from 'vitest'
import { h, type Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { ApiError } from '@/api/client'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { createTestPlugins } from '@/test/mounting'
import type { PagedResponse, PageQuery, ProblemDetail } from '@/types'

const leaf: Component = { render: () => h('div') }

export function crudTestRoutes(name: string): RouteRecordRaw[] {
  return [
    { path: `/${name}`, name, component: leaf },
    { path: `/${name}/create`, name: `${name}.create`, component: leaf },
    { path: `/${name}/:id/update`, name: `${name}.update`, component: leaf },
    { path: `/${name}/:id/detail`, name: `${name}.detail`, component: leaf },
    { path: '/login', name: 'login', meta: { public: true }, component: leaf },
  ]
}

export function pageOf<T>(content: T[], totalElements = content.length): PagedResponse<T> {
  return { content, page: { size: 15, number: 0, totalElements, totalPages: 1 } }
}

export function problem(status: number, body: ProblemDetail = {}): ApiError {
  return new ApiError(body, status)
}

export async function settle() {
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 25))
  await flushPromises()
}

export async function mountView(
  view: Component,
  routeName: string,
  props: Record<string, unknown> = {},
  initialState: Record<string, unknown> = {},
  location?: string,
) {
  installZodErrorMap()
  const { router, plugins } = createTestPlugins({
    routes: crudTestRoutes(routeName),
    stubActions: false,
    initialState,
  })
  if (location) {
    await router.push(location)
  }
  const wrapper = mount(view, { props, attachTo: document.body, global: { plugins } })
  await flushPromises()
  return { wrapper, router }
}

export function buttonWithText(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text().replace(/\s+\d+$/, '') === text)
  if (!button) {
    throw new Error(`no button "${text}"`)
  }
  return button
}

export async function chooseRowAction(
  wrapper: ReturnType<typeof mount>,
  rowIndex: number,
  label: string,
) {
  await wrapper
    .findAll('button[aria-label="Mais ações"]')
    [rowIndex]!.trigger('keydown', { key: 'Enter' })
  await flushPromises()
  const item = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  if (!item) {
    throw new Error(`no menu item "${label}"`)
  }
  item.click()
  await flushPromises()
}

export function useCompactViewport(compact: boolean) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: compact,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList
}

export const FULL_COUNTS: Record<string, number> = { ACTIVE: 4, INACTIVE: 1, ALL: 5 }

export function serveListing<T>(
  findAll: Mock<(query: PageQuery) => Promise<PagedResponse<T>>>,
  content: T[],
  total = content.length,
  counts: Record<string, number> = FULL_COUNTS,
) {
  findAll.mockImplementation((query) =>
    Promise.resolve(
      query.size === 1 ? pageOf<T>([], counts[query.status ?? 'ALL']) : pageOf(content, total),
    ),
  )
}

export function listingCalls(findAll: Mock<(query: PageQuery) => Promise<unknown>>) {
  return findAll.mock.calls.map(([query]) => query).filter((query) => query.size !== 1)
}

export function stateOf(wrapper: ReturnType<typeof mount>) {
  return ['empty', 'no-result', 'error'].find((kind) =>
    wrapper.find(`[data-state="${kind}"]`).exists(),
  )
}
