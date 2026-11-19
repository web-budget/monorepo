import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'
import type { TrustedDeviceView } from '@/types'

export const useTrustedDevicesStore = defineStore('trustedDevices', () => {
  const devices = ref<TrustedDeviceView[]>([])
  const loading = ref(false)

  async function track(operation: () => Promise<void>): Promise<void> {
    loading.value = true
    try {
      await operation()
    } finally {
      loading.value = false
    }
  }

  function findAll(): Promise<void> {
    return track(async () => {
      devices.value = await authApi.findTrustedDevices()
    })
  }

  function revoke(id: string): Promise<void> {
    return track(async () => {
      await authApi.revokeTrustedDevice(id)
      devices.value = devices.value.filter((device) => device.id !== id)
    })
  }

  function revokeAll(): Promise<void> {
    return track(async () => {
      await authApi.revokeAllTrustedDevices()
      devices.value = []
    })
  }

  function reset() {
    devices.value = []
    loading.value = false
  }

  return { devices, loading, findAll, revoke, revokeAll, reset }
})
