import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MovementRequest } from '@/components/compartments/CompartmentMovementDialog.vue'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import type { CompartmentFormValues } from '@/schemas/compartmentSchema'
import { toCompartmentCreateForm, toCompartmentUpdateForm } from '@/schemas/compartmentSchema'
import { useCompartmentsStore } from '@/stores/compartments'
import type {
  CompartmentMovementDirection,
  CompartmentMovementForm,
  CompartmentView,
} from '@/types'

interface CompartmentActionsOptions {
  walletId: () => string
  walletName: () => string
  reload: () => Promise<unknown>
  onRemoved?: () => unknown
}

export function useCompartmentActions(options: CompartmentActionsOptions) {
  const { n } = useI18n()
  const store = useCompartmentsStore()
  const { showSuccess } = useNotification()

  const formOpen = ref(false)
  const formTarget = ref<CompartmentView | null>(null)
  const formErrors = useServerErrors()

  const removeTarget = ref<CompartmentView | null>(null)
  const removeErrors = useServerErrors()

  const movementRequest = ref<MovementRequest | null>(null)
  const movementErrors = useServerErrors()

  function findCompartment(id: string): CompartmentView | null {
    return store.compartments.find((compartment) => compartment.id === id) ?? null
  }

  function money(value: number): string {
    return n(value, 'currency').replace(/^R\$\s*/, '')
  }

  function openCreate() {
    formErrors.clear()
    formTarget.value = null
    formOpen.value = true
  }

  function openEdit(id: string) {
    formErrors.clear()
    formTarget.value = findCompartment(id)
    formOpen.value = true
  }

  function closeForm() {
    formOpen.value = false
  }

  async function submitForm(values: CompartmentFormValues) {
    const target = formTarget.value
    const params = { name: values.name.trim(), wallet: options.walletName() }
    const done = await formErrors.run(() =>
      target
        ? store.update(options.walletId(), target.id, toCompartmentUpdateForm(values))
        : store.create(options.walletId(), toCompartmentCreateForm(values)),
    )
    if (!done) {
      return
    }
    formOpen.value = false
    if (target) {
      showSuccess('compartment.toast.updated', 'compartment.toast.updated-detail', true, params)
    } else {
      showSuccess('compartment.toast.created', 'compartment.toast.created-detail', true, params)
    }
    await options.reload()
  }

  function openRemove(id: string) {
    removeErrors.clear()
    removeTarget.value = findCompartment(id)
  }

  function closeRemove() {
    removeTarget.value = null
  }

  async function confirmRemove() {
    const target = removeTarget.value
    if (target && (await removeErrors.run(() => store.remove(options.walletId(), target.id)))) {
      removeTarget.value = null
      showSuccess('compartment.toast.removed', 'compartment.toast.removed-detail', true, {
        name: target.name,
        wallet: options.walletName(),
      })
      await (options.onRemoved ?? options.reload)()
    }
  }

  function openMovement(direction: CompartmentMovementDirection, id?: string, value?: number) {
    movementErrors.clear()
    movementRequest.value = { direction, compartmentId: id, value }
  }

  function withdrawAll() {
    const target = removeTarget.value
    removeTarget.value = null
    if (target) {
      openMovement('WITHDRAWAL', target.id, target.balance)
    }
  }

  function closeMovement() {
    movementRequest.value = null
  }

  async function move(compartmentId: string, form: CompartmentMovementForm) {
    const target = findCompartment(compartmentId)
    if (await movementErrors.run(() => store.move(options.walletId(), compartmentId, form))) {
      movementRequest.value = null
      const deposit = form.direction === 'DEPOSIT'
      showSuccess(
        deposit ? 'compartment.toast.deposited' : 'compartment.toast.withdrawn',
        deposit ? 'compartment.toast.deposited-detail' : 'compartment.toast.withdrawn-detail',
        true,
        { name: target?.name, amount: money(form.value), wallet: options.walletName() },
      )
      await options.reload()
    }
  }

  return {
    formOpen,
    formTarget,
    formErrors,
    removeTarget,
    removeErrors,
    movementRequest,
    movementErrors,
    openCreate,
    openEdit,
    closeForm,
    submitForm,
    openRemove,
    closeRemove,
    confirmRemove,
    withdrawAll,
    openMovement,
    closeMovement,
    move,
  }
}
