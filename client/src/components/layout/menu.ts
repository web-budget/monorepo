import type { Component } from 'vue'

export interface MenuItemDefinition {
  label: string
  icon?: Component
  to?: string
  visible?: boolean
}

export interface MenuGroup {
  label: string
  items: MenuItemDefinition[]
}
