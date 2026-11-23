import type { Component } from 'vue'
import type { RouteRecordRaw } from 'vue-router'

type LazyView = () => Promise<Component>

interface CrudRouteOptions {
  path: string
  name: string
  entity: string
  list: LazyView
  form?: LazyView
  detail: LazyView
  extra?: RouteRecordRaw[]
}

export function crudRoutes({
  path,
  name,
  entity,
  list,
  form,
  detail,
  extra = [],
}: CrudRouteOptions) {
  const formRoutes: RouteRecordRaw[] = form
    ? [
        {
          path: 'create',
          name: `${name}.create`,
          meta: { breadcrumb: `${entity}.form.new` },
          component: form,
        },
        {
          path: ':id/update',
          name: `${name}.update`,
          props: true,
          meta: { breadcrumb: `${entity}.form.editing` },
          component: form,
        },
      ]
    : []
  const record: RouteRecordRaw = {
    path,
    meta: { breadcrumb: `${entity}.menu` },
    children: [
      { path: '', name, component: list },
      ...formRoutes,
      ...extra,
      {
        path: ':id/detail',
        name: `${name}.detail`,
        props: true,
        meta: { breadcrumb: `${entity}.form.detailing` },
        component: detail,
      },
    ],
  }
  return record
}
