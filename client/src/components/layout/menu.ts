import type { Component } from 'vue'

export interface MenuItemDefinition {
  label: string
  icon?: Component
  to?: string
  exact?: boolean
  visible?: boolean
}

export interface MenuGroup {
  label: string
  items: MenuItemDefinition[]
}
