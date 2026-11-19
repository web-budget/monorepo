<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import CredentialsStep from '@/components/auth/CredentialsStep.vue'
import GoogleLinkStep from '@/components/auth/GoogleLinkStep.vue'
import RegisterStep from '@/components/auth/RegisterStep.vue'
import TotpEnrollStep from '@/components/auth/TotpEnrollStep.vue'
import TotpVerifyStep from '@/components/auth/TotpVerifyStep.vue'
import { useAuthConfig } from '@/composables/useAuthConfig'
import { useLoginFlow } from '@/composables/useLoginFlow'
import { useNotification } from '@/composables/useNotification'
import { useAuthStore } from '@/stores/auth'
import type { SessionResponse } from '@/types'
import { queryValue } from '@/utils/queryValue'

const route = useRoute()
const auth = useAuthStore()
const { googleAuthEnabled } = useAuthConfig()
const { showWarn } = useNotification()
const {
  step,
  submitting,
  credentialsFailure,
  registerRateLimited,
  totpFailure,
  enrollment,
  linkMode,
  linkRateLimited,
  finish,
  submitCredentials,
  showRegister,
  showCredentials,
  submitRegistration,
  submitTotp,
  submitEnrollment,
  submitLinkPassword,
  submitLinkCode,
} = useLoginFlow()

const SESSION_END_REASONS = ['inactivity', 'expired']

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
    await finish(auth.session as SessionResponse)
  }
})
</script>

<template>
  <RegisterStep
    v-if="step === 'register'"
    :loading="submitting"
    :rate-limited="registerRateLimited"
    @submit="submitRegistration"
    @back="showCredentials"
  />
  <TotpEnrollStep
    v-else-if="step === 'enroll' && enrollment"
    :enrollment="enrollment"
    :loading="submitting"
    :failure="totpFailure"
    @submit="submitEnrollment"
    @cancel="showCredentials"
  />
  <TotpVerifyStep
    v-else-if="step === 'totp'"
    :loading="submitting"
    :failure="totpFailure"
    @submit="submitTotp"
    @cancel="showCredentials"
  />
  <GoogleLinkStep
    v-else-if="step === 'link'"
    :mode="linkMode"
    :loading="submitting"
    :rate-limited="linkRateLimited"
    @submit-password="submitLinkPassword"
    @submit-code="submitLinkCode"
    @cancel="showCredentials"
  />
  <CredentialsStep
    v-else
    :loading="submitting"
    :failure="credentialsFailure"
    :google-enabled="googleAuthEnabled"
    registration-enabled
    @submit="submitCredentials"
    @register="showRegister"
  />
</template>
