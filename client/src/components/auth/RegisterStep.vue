<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { useForm } from 'vee-validate'
import AuthFailureAlert from '@/components/auth/AuthFailureAlert.vue'
import AuthStepHeader from '@/components/auth/AuthStepHeader.vue'
import PasswordRequirements from '@/components/auth/PasswordRequirements.vue'
import PasswordInput from '@/components/forms/PasswordInput.vue'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { registerFormSchema, type RegisterFormValues } from '@/schemas/registerSchema'

defineProps<{ loading: boolean; rateLimited: boolean }>()

const emit = defineEmits<{ submit: [values: RegisterFormValues]; back: [] }>()

const { handleSubmit, values } = useForm({
  validationSchema: registerFormSchema,
  initialValues: { name: '', email: '', password: '' },
})

const submit = handleSubmit((formValues) => emit('submit', formValues))
</script>

<template>
  <div class="grid gap-6">
    <AuthStepHeader :title="$t('register.title')">{{ $t('register.description') }}</AuthStepHeader>
    <AuthFailureAlert
      v-if="rateLimited"
      rate-limit
      :title="$t('register.rate-limit.title')"
      :description="$t('register.rate-limit.description')"
    />
    <form novalidate @submit="submit">
      <fieldset class="grid min-w-0 gap-4" :disabled="loading">
        <FormField v-slot="{ componentField }" name="name">
          <FormItem>
            <FormLabel>{{ $t('register.form.name') }}</FormLabel>
            <FormControl>
              <Input type="text" autocomplete="name" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="email">
          <FormItem>
            <FormLabel>{{ $t('register.form.email') }}</FormLabel>
            <FormControl>
              <Input
                type="email"
                autocomplete="email"
                :placeholder="$t('login.form.email-placeholder')"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="password">
          <FormItem>
            <FormLabel>{{ $t('register.form.password') }}</FormLabel>
            <FormControl>
              <PasswordInput autocomplete="new-password" v-bind="componentField" />
            </FormControl>
            <PasswordRequirements :password="values.password" />
            <FormMessage />
          </FormItem>
        </FormField>
        <Button type="submit" size="lg" class="mt-1 w-full" :disabled="loading">
          <Loader2 v-if="loading" class="animate-spin" />
          {{ loading ? $t('register.form.submitting') : $t('register.form.submit') }}
        </Button>
      </fieldset>
    </form>
    <p class="text-muted-foreground text-center">
      {{ $t('register.back.prompt') }}
      <button type="button" class="text-primary font-medium hover:underline" @click="emit('back')">
        {{ $t('register.back.action') }}
      </button>
    </p>
  </div>
</template>
