<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

defineOptions({ inheritAttrs: false })

const model = defineModel<string>()
const visible = ref(false)
</script>

<template>
  <div class="relative">
    <Input v-bind="$attrs" v-model="model" :type="visible ? 'text' : 'password'" class="pr-10" />
    <Button
      type="button"
      variant="ghost"
      size="icon"
      class="absolute inset-y-0 right-0"
      :aria-label="visible ? $t('password-input.hide') : $t('password-input.show')"
      :aria-pressed="visible"
      @click="visible = !visible"
    >
      <EyeOff v-if="visible" />
      <Eye v-else />
    </Button>
  </div>
</template>
