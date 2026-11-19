import { onMounted, ref } from 'vue'
import { authApi } from '@/api/auth'

export function useAuthConfig() {
  const googleAuthEnabled = ref(false)

  onMounted(async () => {
    try {
      const config = await authApi.fetchConfig()
      googleAuthEnabled.value = config.googleAuthEnabled
    } catch {
      googleAuthEnabled.value = false
    }
  })

  return { googleAuthEnabled }
}
