<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Label } from '@/components/ui/label'
import { parseMoneyInput } from '@/utils/money'

const CURRENCY_SYMBOL = /^R\$\s*/

defineProps<{ label: string; id: string }>()

const model = defineModel<string>({ required: true })

const { n } = useI18n()

function format(text: string) {
  return text === '' ? '' : n(Number(text), 'currency').replace(CURRENCY_SYMBOL, '')
}

function read(event: Event) {
  const input = event.target as HTMLInputElement
  const amount = parseMoneyInput(input.value, format(model.value))
  model.value = amount === null ? '' : String(amount)
  input.value = format(model.value)
}
</script>

<template>
  <div class="grid min-w-0 content-start gap-2">
    <Label :for="id">{{ label }}</Label>
    <div
      class="border-input bg-card focus-within:border-ring focus-within:ring-ring/40 flex h-9 w-full min-w-0 items-center overflow-hidden rounded-md border text-sm shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]"
    >
      <span
        aria-hidden="true"
        class="border-input bg-muted text-muted-foreground flex h-full items-center border-r px-2.5 font-mono text-xs"
        >R$</span
      >
      <input
        :id="id"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        placeholder="0,00"
        :value="format(model)"
        class="h-full min-w-0 flex-1 bg-transparent px-3 text-right font-mono tabular-nums outline-none"
        @input="read"
      />
    </div>
  </div>
</template>
