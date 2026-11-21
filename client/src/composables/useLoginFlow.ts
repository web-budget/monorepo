import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/client'
import type { GoogleLinkMode } from '@/components/auth/GoogleLinkStep.vue'
import type { CredentialsFailure } from '@/components/auth/CredentialsStep.vue'
import type { TotpFailure } from '@/components/auth/totpFailure'
import { LOCALE_LANGUAGES } from '@/locales/languages'
import { useAuthStore } from '@/stores/auth'
import { useLanguageStore } from '@/stores/language'
import type { LoginOutcome, SessionResponse, TotpEnrollResponse } from '@/types'
import { describeApiError } from '@/utils/apiErrorNotice'
import { markHandled } from '@/utils/handledErrors'
import { queryValue } from '@/utils/queryValue'
import { safeRedirect } from '@/utils/safeRedirect'

export type LoginStep = 'credentials' | 'register' | 'enroll' | 'totp' | 'link'

interface Credentials {
  email: string
  password: string
}

const TOO_MANY_REQUESTS = 429
const LINK_REJECTION_STATUSES = new Set([400, 401])
const GOOGLE_RETURN_PARAMETERS = ['error', 'linkToken']

export function useLoginFlow() {
  const route = useRoute()
  const router = useRouter()
  const auth = useAuthStore()
  const language = useLanguageStore()

  const step = ref<LoginStep>('credentials')
  const submitting = ref(false)
  const credentialsFailure = ref<CredentialsFailure | null>(null)
  const registerRateLimited = ref(false)
  const totpFailure = ref<TotpFailure | null>(null)
  const enrollment = ref<TotpEnrollResponse | null>(null)
  const linkMode = ref<GoogleLinkMode>('password')
  const linkRateLimited = ref(false)

  let credentials: Credentials | null = null
  let linkToken: string | null = null
  let linkPassword: string | null = null

  function forgetSecrets() {
    credentials = null
    linkToken = null
    linkPassword = null
    enrollment.value = null
  }

  function restart(failure: CredentialsFailure | null = null) {
    forgetSecrets()
    totpFailure.value = null
    credentialsFailure.value = failure
    step.value = 'credentials'
  }

  function readGoogleReturn() {
    const error = queryValue(route.query.error)
    const token = queryValue(route.query.linkToken)
    if (error === '') {
      return
    }
    if (error === 'email_in_use' && token !== '') {
      linkToken = token
      step.value = 'link'
    } else {
      credentialsFailure.value = error === 'email_in_use' ? 'email-in-use' : 'oauth-failed'
    }
  }

  readGoogleReturn()

  onMounted(async () => {
    if (!GOOGLE_RETURN_PARAMETERS.some((parameter) => parameter in route.query)) {
      return
    }
    const query = { ...route.query }
    GOOGLE_RETURN_PARAMETERS.forEach((parameter) => delete query[parameter])
    await router.replace({ query })
  })

  onBeforeUnmount(forgetSecrets)

  async function finish(session: SessionResponse) {
    forgetSecrets()
    if (session.status !== 'APPROVED') {
      await router.push({ name: 'pending-approval' })
      return
    }
    await router.push(safeRedirect(route.query.redirect) ?? { name: 'start' })
  }

  async function run(action: () => Promise<void>) {
    if (submitting.value) {
      return
    }
    submitting.value = true
    try {
      await action()
    } finally {
      submitting.value = false
    }
  }

  function isRateLimited(error: unknown): boolean {
    return error instanceof ApiError && error.status === TOO_MANY_REQUESTS
  }

  function credentialsFailureOf(error: unknown): CredentialsFailure | null {
    if (isRateLimited(error)) {
      return 'rate-limit'
    }
    return error instanceof ApiError && describeApiError(error) === null ? 'credentials' : null
  }

  async function startEnrollment(current: Credentials) {
    try {
      enrollment.value = await auth.enrollTotp(current)
    } catch (error) {
      restart(credentialsFailureOf(error))
      return
    }
    totpFailure.value = null
    step.value = 'enroll'
  }

  async function continueAfter(outcome: LoginOutcome, current: Credentials) {
    if (outcome.kind === 'authenticated') {
      await finish(outcome.session)
    } else if (outcome.kind === 'needs_enrollment') {
      credentials = current
      await startEnrollment(current)
    } else {
      credentials = current
      totpFailure.value = null
      step.value = 'totp'
    }
  }

  function submitCredentials(values: Credentials) {
    return run(async () => {
      credentialsFailure.value = null
      let outcome: LoginOutcome
      try {
        outcome = await auth.login({ email: values.email, password: values.password })
      } catch (error) {
        credentialsFailure.value = credentialsFailureOf(error)
        return
      }
      await continueAfter(outcome, { email: values.email, password: values.password })
    })
  }

  function showRegister() {
    credentialsFailure.value = null
    registerRateLimited.value = false
    step.value = 'register'
  }

  function showCredentials() {
    restart()
    registerRateLimited.value = false
  }

  function submitRegistration(values: { name: string; email: string; password: string }) {
    return run(async () => {
      registerRateLimited.value = false
      try {
        await auth.register({ ...values, defaultLanguage: LOCALE_LANGUAGES[language.locale] })
      } catch (error) {
        registerRateLimited.value = isRateLimited(error)
        return
      }
      await router.push({ name: 'pending-approval' })
    })
  }

  function totpFailureOf(error: unknown): TotpFailure | null {
    if (isRateLimited(error)) {
      return 'rate-limit'
    }
    return error instanceof ApiError && error.error === 'invalid_totp_code' ? 'invalid-code' : null
  }

  function handleTotpError(error: unknown) {
    const failure = totpFailureOf(error)
    if (failure !== null) {
      totpFailure.value = failure
      return
    }
    if (error instanceof ApiError && error.error === 'totp_already_enabled') {
      markHandled(error)
      totpFailure.value = null
      enrollment.value = null
      step.value = 'totp'
      return
    }
    const rejection = credentialsFailureOf(error)
    if (rejection !== null) {
      restart(rejection)
    }
  }

  function submitTotp(payload: { code: string; trustDevice: boolean }) {
    return run(async () => {
      const current = credentials as Credentials
      totpFailure.value = null
      let outcome: LoginOutcome
      try {
        outcome = await auth.login({
          ...current,
          totpCode: payload.code,
          trustDevice: payload.trustDevice,
        })
      } catch (error) {
        handleTotpError(error)
        return
      }
      if (outcome.kind === 'authenticated') {
        await finish(outcome.session)
      } else {
        totpFailure.value = 'invalid-code'
      }
    })
  }

  function submitEnrollment(code: string) {
    return run(async () => {
      const current = credentials as Credentials
      totpFailure.value = null
      let session: SessionResponse
      try {
        session = await auth.verifyTotp({ ...current, code })
      } catch (error) {
        handleTotpError(error)
        return
      }
      await finish(session)
    })
  }

  function expireLink() {
    linkToken = null
    linkPassword = null
    linkMode.value = 'expired'
  }

  function handleLinkError(error: unknown) {
    if (isRateLimited(error)) {
      linkRateLimited.value = true
      return
    }
    if (error instanceof ApiError && LINK_REJECTION_STATUSES.has(error.status as number)) {
      markHandled(error)
      expireLink()
    }
  }

  async function linkWith(request: { password: string; totpCode?: string }) {
    linkRateLimited.value = false
    let outcome: LoginOutcome
    try {
      outcome = await auth.linkGoogle({ linkToken: linkToken as string, ...request })
    } catch (error) {
      handleLinkError(error)
      return
    }
    if (outcome.kind === 'authenticated') {
      await finish(outcome.session)
    } else {
      linkPassword = request.password
      linkMode.value = 'totp'
    }
  }

  function submitLinkPassword(password: string) {
    return run(() => linkWith({ password }))
  }

  function submitLinkCode(code: string) {
    return run(() => linkWith({ password: linkPassword as string, totpCode: code }))
  }

  return {
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
  }
}
