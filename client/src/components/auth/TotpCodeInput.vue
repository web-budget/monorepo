<script setup lang="ts">
import { PinInputInput, PinInputRoot } from 'reka-ui'
import { computed, useTemplateRef, watch } from 'vue'
import { isCompleteTotpCode, TOTP_CODE_LENGTH } from '@/utils/totpCode'

const props = defineProps<{ invalid?: boolean; disabled?: boolean; label: string }>()

const model = defineModel<string>({ default: '' })
const emit = defineEmits<{ complete: [code: string] }>()

const root = useTemplateRef<{ $el: HTMLElement }>('root')

const digits = computed({
  get: () => Array.from(model.value, Number),
  set: (value: (number | undefined)[]) => {
    model.value = value.filter((digit) => digit !== undefined).join('')
  },
})

let announced = ''

watch(model, (value) => {
  if (!isCompleteTotpCode(value)) {
    announced = ''
  }
})

function announce(code: string) {
  if (code !== announced) {
    announced = code
    emit('complete', code)
  }
}

const positions = Array.from({ length: TOTP_CODE_LENGTH }, (_, position) => position)
const SEPARATOR_AFTER = TOTP_CODE_LENGTH / 2 - 1

function focus() {
  root.value?.$el.querySelector<HTMLInputElement>('input[autocomplete="one-time-code"]')?.focus()
}

defineExpose({ focus })
</script>

<template>
  <PinInputRoot
    ref="root"
    v-model="digits"
    otp
    type="number"
    :disabled="disabled"
    :aria-label="label"
    class="flex items-center gap-1.5"
    data-slot="totp-code-input"
    @complete="announce($event.join(''))"
  >
    <template v-for="position in positions" :key="position">
      <PinInputInput
        :index="position"
        :aria-label="`${label} ${position + 1}`"
        :aria-invalid="props.invalid || undefined"
        inputmode="numeric"
        autocomplete="one-time-code"
        class="border-input bg-card text-foreground focus-visible:border-ring focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-12 w-10 rounded-md border text-center font-mono text-xl font-medium outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 min-[420px]:w-11"
      />
      <span
        v-if="position === SEPARATOR_AFTER"
        class="bg-muted-foreground h-px w-2.5"
        aria-hidden="true"
      />
    </template>
  </PinInputRoot>
</template>
