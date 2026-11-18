<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import CredentialsStep, { type CredentialsFailure } from '@/components/auth/CredentialsStep.vue'
import { useAuthConfig } from '@/composables/useAuthConfig'
import { useNotification } from '@/composables/useNotification'
import type { LoginFormValues } from '@/schemas/loginSchema'
import { useAuthStore } from '@/stores/auth'
import { describeApiError } from '@/utils/apiErrorNotice'
import { queryValue } from '@/utils/queryValue'
import { safeRedirect } from '@/utils/safeRedirect'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { googleAuthEnabled } = useAuthConfig()
const { showWarn } = useNotification()

const SESSION_END_REASONS = ['inactivity', 'expired']
const TOO_MANY_REQUESTS = 429

const failure = ref<CredentialsFailure | null>(null)
const signingIn = ref(false)

async function goAfterLogin() {
  await router.push(safeRedirect(route.query.redirect) ?? { name: 'home' })
}

function failureOf(error: unknown): CredentialsFailure | null {
  if (!(error instanceof ApiError)) {
    return null
  }
  if (error.status === TOO_MANY_REQUESTS) {
    return 'rate-limit'
  }
  return describeApiError(error) === null ? 'credentials' : null
}

async function submit(values: LoginFormValues) {
  failure.value = null
  signingIn.value = true
  try {
    await auth.login(values)
  } catch (error) {
    failure.value = failureOf(error)
    return
  } finally {
    signingIn.value = false
  }
  await goAfterLogin()
}

function notifySessionEnded() {
  const reason = queryValue(route.query.reason)
  if (SESSION_END_REASONS.includes(reason)) {
    showWarn('login.session-ended.title', `login.session-ended.${reason}`)
  }
}

onMounted(async () => {
  notifySessionEnded()
  if (auth.endingSession) {
    return
  }
  if (auth.isAuthenticated || (await auth.restoreSession())) {
    await goAfterLogin()
  }
})
</script>

<template>
  <CredentialsStep
    :loading="signingIn"
    :failure="failure"
    :google-enabled="googleAuthEnabled"
    @submit="submit"
  />
</template>
