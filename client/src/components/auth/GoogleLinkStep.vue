<script setup lang="ts">
import { ArrowLeftRight, Loader2 } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import { ref } from 'vue'
import AuthFailureAlert from '@/components/auth/AuthFailureAlert.vue'
import AuthStepHeader from '@/components/auth/AuthStepHeader.vue'
import TotpCodeInput from '@/components/auth/TotpCodeInput.vue'
import BrandMark from '@/components/brand/BrandMark.vue'
import PasswordInput from '@/components/forms/PasswordInput.vue'
import GoogleMark from '@/components/icons/GoogleMark.vue'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { linkFormSchema } from '@/schemas/linkSchema'
import { isCompleteTotpCode } from '@/utils/totpCode'

export type GoogleLinkMode = 'password' | 'totp' | 'expired'

const props = defineProps<{ mode: GoogleLinkMode; loading: boolean; rateLimited: boolean }>()

const emit = defineEmits<{
  submitPassword: [password: string]
  submitCode: [code: string]
  cancel: []
}>()

const code = ref('')

const { handleSubmit } = useForm({
  validationSchema: linkFormSchema,
  initialValues: { password: '' },
})

const submitPassword = handleSubmit((values) => emit('submitPassword', values.password))

function submitCode() {
  if (isCompleteTotpCode(code.value) && !props.loading) {
    emit('submitCode', code.value)
  }
}
</script>

<template>
  <div class="grid gap-6">
    <div class="flex items-center gap-3" aria-hidden="true">
      <span class="border-border bg-card grid size-11 place-content-center rounded-md border">
        <GoogleMark class="size-5" />
      </span>
      <ArrowLeftRight class="text-muted-foreground size-4" />
      <BrandMark :size="44" />
    </div>
    <template v-if="mode === 'expired'">
      <AuthStepHeader :title="$t('google-link.expired.title')">
        {{ $t('google-link.expired.description') }}
      </AuthStepHeader>
      <Button size="lg" class="w-full" as-child>
        <a href="/private/oauth2/authorization/google">
          <GoogleMark />
          {{ $t('login.google') }}
        </a>
      </Button>
      <Button type="button" variant="ghost" class="w-full" @click="emit('cancel')">
        {{ $t('google-link.cancel') }}
      </Button>
    </template>
    <template v-else>
      <AuthStepHeader :title="$t('google-link.title')">
        {{ $t(mode === 'password' ? 'google-link.description' : 'google-link.totp-description') }}
      </AuthStepHeader>
      <AuthFailureAlert
        v-if="rateLimited"
        rate-limit
        :title="$t('google-link.rate-limit.title')"
        :description="$t('google-link.rate-limit.description')"
      />
      <form v-if="mode === 'password'" novalidate @submit="submitPassword">
        <fieldset class="grid min-w-0 gap-4" :disabled="loading">
          <FormField v-slot="{ componentField }" name="password">
            <FormItem>
              <FormLabel>{{ $t('google-link.password') }}</FormLabel>
              <FormControl>
                <PasswordInput autocomplete="current-password" v-bind="componentField" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <Button type="submit" size="lg" class="w-full" :disabled="loading">
            <Loader2 v-if="loading" class="animate-spin" />
            {{ loading ? $t('google-link.submitting') : $t('google-link.submit') }}
          </Button>
          <Button type="button" variant="ghost" class="w-full" @click="emit('cancel')">
            {{ $t('google-link.cancel') }}
          </Button>
        </fieldset>
      </form>
      <form v-else class="grid gap-4" novalidate @submit.prevent="submitCode">
        <TotpCodeInput
          v-model="code"
          :label="$t('totp.code-label')"
          :disabled="loading"
          @complete="submitCode"
        />
        <Button
          type="submit"
          size="lg"
          class="w-full"
          :disabled="loading || !isCompleteTotpCode(code)"
        >
          <Loader2 v-if="loading" class="animate-spin" />
          {{ loading ? $t('google-link.submitting') : $t('google-link.submit') }}
        </Button>
        <Button type="button" variant="ghost" class="w-full" @click="emit('cancel')">
          {{ $t('google-link.cancel') }}
        </Button>
      </form>
    </template>
  </div>
</template>
