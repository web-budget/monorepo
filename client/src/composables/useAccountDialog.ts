import { readonly, ref } from 'vue'

export const ACCOUNT_TABS = [
  'profile',
  'preferences',
  'notifications',
  'password',
  'security',
] as const

export type AccountTab = (typeof ACCOUNT_TABS)[number]

const open = ref(false)
const tab = ref<AccountTab | null>(null)

export function useAccountDialog() {
  return {
    open: readonly(open),
    tab: readonly(tab),
    show: (initialTab: AccountTab | null = null) => {
      tab.value = initialTab
      open.value = true
    },
    select: (nextTab: AccountTab | null) => {
      tab.value = nextTab
    },
    close: () => {
      open.value = false
    },
  }
}
