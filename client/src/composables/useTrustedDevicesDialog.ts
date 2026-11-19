import { readonly, ref } from 'vue'

const open = ref(false)

export function useTrustedDevicesDialog() {
  return {
    open: readonly(open),
    show: () => {
      open.value = true
    },
    close: () => {
      open.value = false
    },
  }
}
