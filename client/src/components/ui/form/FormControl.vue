<script lang="ts" setup>
import { Slot } from 'reka-ui'
import { computed } from 'vue'
import { SERVER_ERROR_ALERT_ID } from './injectionKeys'
import { useFormField } from './useFormField'

const { error, serverError, formItemId, formDescriptionId, formMessageId } = useFormField()

const describedBy = computed(() => {
  if (serverError.value) {
    return `${formDescriptionId} ${SERVER_ERROR_ALERT_ID}`
  }
  return error.value ? `${formDescriptionId} ${formMessageId}` : formDescriptionId
})
</script>

<template>
  <Slot
    :id="formItemId"
    data-slot="form-control"
    :aria-describedby="describedBy"
    :aria-invalid="!!error || serverError"
  >
    <slot />
  </Slot>
</template>
