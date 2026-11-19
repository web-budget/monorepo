import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { h, type Component } from 'vue'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { SidebarProvider } from '@/components/ui/sidebar'
import i18n from '@/locales'

interface TestPluginsOptions {
  routes?: RouteRecordRaw[]
  stubActions?: boolean
  initialState?: Record<string, unknown>
}

export function createTestPlugins(options: TestPluginsOptions = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => h('div', 'root') } },
      { path: '/:pathMatch(.*)*', component: { render: () => h('div') } },
      ...(options.routes ?? []),
    ],
  })
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: options.stubActions ?? true,
    initialState: options.initialState,
  })
  return { router, pinia, plugins: [router, pinia, i18n] }
}

export function mountInSidebar(
  component: Component,
  props: Record<string, unknown>,
  plugins: unknown[],
) {
  const Host = { render: () => h(SidebarProvider, null, { default: () => h(component, props) }) }
  return mount(Host, { attachTo: document.body, global: { plugins: plugins as never[] } })
}
