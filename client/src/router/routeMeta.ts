import 'vue-router'
import type { Role } from '@/types'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    breadcrumb?: string
    role?: Role
  }
}
