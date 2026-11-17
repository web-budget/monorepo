import { flushPromises, mount } from '@vue/test-utils'
import { h, type Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { ApiError } from '@/api/client'
import { installZodErrorMap } from '@/schemas/zodErrorMap'
import { createTestPlugins } from '@/test/mounting'
import type { PagedResponse, ProblemDetail } from '@/types'

const leaf: Component = { render: () => h('div') }

export function crudTestRoutes(name: string): RouteRecordRaw[] {
  return [
    { path: `/${name}`, name, component: leaf },
    { path: `/${name}/create`, name: `${name}.create`, component: leaf },
    { path: `/${name}/:id/update`, name: `${name}.update`, component: leaf },
    { path: `/${name}/:id/detail`, name: `${name}.detail`, component: leaf },
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
) {
  installZodErrorMap()
  const { router, plugins } = createTestPlugins({
    routes: crudTestRoutes(routeName),
    stubActions: false,
    initialState,
  })
  const wrapper = mount(view, { props, attachTo: document.body, global: { plugins } })
  await flushPromises()
  return { wrapper, router }
}

export function buttonWithText(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === text)
  if (!button) {
    throw new Error(`no button "${text}"`)
  }
  return button
}
