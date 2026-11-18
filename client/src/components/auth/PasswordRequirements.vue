<script setup lang="ts">
import { Check, Circle } from 'lucide-vue-next'
import { computed } from 'vue'
import { PASSWORD_MIN_LENGTH, passwordRequirementStatus } from '@/utils/passwordRules'

const props = withDefaults(defineProps<{ password?: string }>(), { password: '' })

const requirements = computed(() => {
  const status = passwordRequirementStatus(props.password)
  return [
    { key: 'min-length', met: status.minLength },
    { key: 'uppercase', met: status.uppercase },
    { key: 'number', met: status.number },
  ]
})
</script>

<template>
  <ul class="grid gap-1 text-xs" data-slot="password-requirements">
    <li
      v-for="requirement in requirements"
      :key="requirement.key"
      class="flex items-center gap-1.5"
      :class="requirement.met ? 'text-income' : 'text-muted-foreground'"
      :data-met="requirement.met"
    >
      <Check v-if="requirement.met" class="size-3.5" />
      <Circle v-else class="size-3.5" />
      {{ $t(`password-rules.${requirement.key}`, { minimum: PASSWORD_MIN_LENGTH }) }}
      <span class="sr-only">
        {{ requirement.met ? $t('password-rules.met') : $t('password-rules.pending') }}
      </span>
    </li>
  </ul>
</template>
