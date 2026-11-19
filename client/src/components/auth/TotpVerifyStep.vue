<script setup lang="ts">
import { ArrowLeft, Loader2 } from 'lucide-vue-next'
import { ref, useTemplateRef, watch } from 'vue'
import AuthFailureAlert from '@/components/auth/AuthFailureAlert.vue'
import AuthStepHeader from '@/components/auth/AuthStepHeader.vue'
import TotpCodeInput from '@/components/auth/TotpCodeInput.vue'
import type { TotpFailure } from '@/components/auth/totpFailure'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { isCompleteTotpCode } from '@/utils/totpCode'

const props = defineProps<{ loading: boolean; failure: TotpFailure | null }>()

const emit = defineEmits<{
  submit: [payload: { code: string; trustDevice: boolean }]
  cancel: []
}>()

const code = ref('')
const trustDevice = ref(false)
const input = useTemplateRef<{ focus: () => void }>('input')

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
    emit('submit', { code: code.value, trustDevice: trustDevice.value })
  }
}
</script>

<template>
  <div class="grid gap-6">
    <AuthStepHeader :title="$t('totp.title')">{{ $t('totp.description') }}</AuthStepHeader>
    <AuthFailureAlert
      v-if="failure === 'rate-limit'"
      rate-limit
      :title="$t('totp.rate-limit.title')"
      :description="$t('totp.rate-limit.description')"
    />
    <form class="grid gap-4" novalidate @submit.prevent="submit">
      <div class="grid gap-2">
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
      <div class="flex items-start gap-2.5">
        <Checkbox id="trust-device" v-model="trustDevice" class="mt-0.5" :disabled="loading" />
        <Label for="trust-device" class="grid gap-0.5 font-normal">
          <span class="font-medium">{{ $t('totp.trust.label') }}</span>
          <span class="text-muted-foreground text-xs">{{ $t('totp.trust.hint') }}</span>
        </Label>
      </div>
      <Button
        type="submit"
        size="lg"
        class="w-full"
        :disabled="loading || !isCompleteTotpCode(code)"
      >
        <Loader2 v-if="loading" class="animate-spin" />
        {{ loading ? $t('totp.submitting') : $t('totp.submit') }}
      </Button>
    </form>
    <button
      type="button"
      class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 justify-self-center"
      @click="emit('cancel')"
    >
      <ArrowLeft class="size-4" />
      {{ $t('totp.use-another-account') }}
    </button>
  </div>
</template>
