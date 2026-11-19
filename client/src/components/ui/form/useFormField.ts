import { FieldContextKey } from 'vee-validate'
import { computed, inject, toValue } from 'vue'
import { FORM_ITEM_INJECTION_KEY, SERVER_FIELDS_INJECTION_KEY } from './injectionKeys'

export function useFormField() {
  const fieldContext = inject(FieldContextKey)
  const fieldItemContext = inject(FORM_ITEM_INJECTION_KEY)
  const serverFields = inject(SERVER_FIELDS_INJECTION_KEY, null)

  if (!fieldContext) throw new Error('useFormField should be used within <FormField>')

  const { name, errorMessage: error, meta } = fieldContext
  const id = fieldItemContext

  const fieldState = {
    valid: computed(() => meta.valid),
    isDirty: computed(() => meta.dirty),
    isTouched: computed(() => meta.touched),
    error,
    serverError: computed(() => serverFields?.value.includes(toValue(name)) ?? false),
  }

  return {
    id,
    name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}
