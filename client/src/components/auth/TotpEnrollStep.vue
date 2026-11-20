<script setup lang="ts">
import { Copy, Loader2 } from 'lucide-vue-next'
import { computed, ref, useTemplateRef, watch } from 'vue'
import AuthFailureAlert from '@/components/auth/AuthFailureAlert.vue'
import AuthStepHeader from '@/components/auth/AuthStepHeader.vue'
import TotpCodeInput from '@/components/auth/TotpCodeInput.vue'
import type { TotpFailure } from '@/components/auth/totpFailure'
import { Button } from '@/components/ui/button'
import { useNotification } from '@/composables/useNotification'
import type { TotpEnrollResponse } from '@/types'
import { isCompleteTotpCode } from '@/utils/totpCode'

const props = defineProps<{
  enrollment: TotpEnrollResponse
  loading: boolean
  failure: TotpFailure | null
}>()

const emit = defineEmits<{ submit: [code: string]; cancel: [] }>()

const { showSuccess } = useNotification()

const code = ref('')
const input = useTemplateRef<{ focus: () => void }>('input')

const groupedKey = computed(() => props.enrollment.secretKey.replace(/(.{4})(?=.)/g, '$1 '))

watch(
  () => props.failure,
  (failure) => {
    if (failure !== null) {
      code.value = ''
      input.value?.focus()
    }
  },
)

function submit() {
  if (isCompleteTotpCode(code.value) && !props.loading) {
    emit('submit', code.value)
  }
}

async function copyKey() {
  await navigator.clipboard.writeText(props.enrollment.secretKey)
  showSuccess('enroll.key-copied')
}
</script>

<template>
  <form class="grid gap-5" novalidate @submit.prevent="submit">
    <AuthStepHeader :title="$t('enroll.title')">{{ $t('enroll.description') }}</AuthStepHeader>
    <AuthFailureAlert
      v-if="failure === 'rate-limit'"
      rate-limit
      :title="$t('totp.rate-limit.title')"
      :description="$t('totp.rate-limit.description')"
    />
    <ol class="grid gap-4">
      <li class="grid grid-cols-[auto_1fr] gap-3">
        <span
          class="bg-secondary inline-grid size-[22px] place-content-center rounded-md font-mono text-xs font-medium"
          aria-hidden="true"
          >1</span
        >
        <div class="grid gap-3">
          <span>{{ $t('enroll.scan') }}</span>
          <div class="flex flex-wrap items-center gap-4">
            <img
              :src="enrollment.qrCodeDataUri"
              :alt="$t('enroll.qr-alt')"
              class="border-border size-32 shrink-0 rounded-sm border bg-white p-2"
            />
            <div class="text-muted-foreground grid gap-1 text-xs">
              {{ $t('enroll.manual') }}
              <span
                class="text-foreground font-mono text-sm break-all tabular-nums"
                data-slot="secret-key"
              >
                {{ groupedKey }}
              </span>
              <Button type="button" variant="ghost" size="sm" class="-ml-3 w-fit" @click="copyKey">
                <Copy />
                {{ $t('enroll.copy') }}
              </Button>
            </div>
          </div>
        </div>
      </li>
      <li class="grid grid-cols-[auto_1fr] gap-3">
        <span
          class="bg-secondary inline-grid size-[22px] place-content-center rounded-md font-mono text-xs font-medium"
          aria-hidden="true"
          >2</span
        >
        <div class="grid gap-3">
          <span>{{ $t('enroll.enter-code') }}</span>
          <TotpCodeInput
            ref="input"
            v-model="code"
            :label="$t('totp.code-label')"
            :invalid="failure === 'invalid-code'"
            :disabled="loading"
            @complete="submit"
          />
          <span v-if="failure === 'invalid-code'" class="text-destructive text-xs">
            {{ $t('totp.invalid-code') }}
          </span>
        </div>
      </li>
    </ol>
    <Button type="submit" size="lg" class="w-full" :disabled="loading || !isCompleteTotpCode(code)">
      <Loader2 v-if="loading" class="animate-spin" />
      {{ loading ? $t('enroll.submitting') : $t('enroll.submit') }}
    </Button>
    <button
      type="button"
      class="text-muted-foreground hover:text-foreground justify-self-center"
      @click="emit('cancel')"
    >
      {{ $t('totp.use-another-account') }}
    </button>
  </form>
</template>
