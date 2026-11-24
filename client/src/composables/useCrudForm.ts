import type { FormContext, GenericObject } from 'vee-validate'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { isPublicRoute } from '@/router/publicRoutes'

type Resettable<Values extends GenericObject, Output extends GenericObject> = NonNullable<
  Parameters<FormContext<Values, Output>['resetForm']>[0]
>['values']

interface CrudFormOptions<Values extends GenericObject, Output extends GenericObject, Entity> {
  routeName: string
  entity: string
  id: () => string | undefined
  form: Pick<FormContext<Values, Output>, 'handleSubmit' | 'resetForm' | 'values' | 'meta'>
  findOne: (id: string) => Promise<Entity>
  toFormValues: (entity: Entity) => Parameters<FormContext<Values, Output>['setValues']>[0]
  create: (values: Output) => Promise<string>
  update: (id: string, values: Output) => Promise<unknown>
  confirm?: (updating: boolean) => Promise<boolean>
  detailAfterUpdate?: boolean
}

const FIRST_CONTROL = 'form fieldset :is(input, textarea, button[role="combobox"]):not([disabled])'

function focusFirstInvalidControl() {
  document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus()
}

function focusFirstControl() {
  document.querySelector<HTMLElement>(FIRST_CONTROL)?.focus()
}

export function useCrudForm<Values extends GenericObject, Output extends GenericObject, Entity>(
  options: CrudFormOptions<Values, Output, Entity>,
) {
  const router = useRouter()
  const { confirmDiscard } = useConfirmDialog()
  const { showSuccess } = useNotification()
  const { messages, fields, clearFields, run } = useServerErrors()

  const submitting = ref(false)
  const saved = ref(false)
  const loadingRecord = ref(false)
  const dirty = computed(() => options.form.meta.value.dirty)

  function changeToList() {
    return router.push({ name: options.routeName })
  }

  async function load(id: string) {
    loadingRecord.value = true
    try {
      const values = options.toFormValues(await options.findOne(id))
      options.form.resetForm({ values: values as Resettable<Values, Output> })
    } finally {
      loadingRecord.value = false
    }
  }

  function recordName(): string {
    const value = options.form.values.name
    return typeof value === 'string' ? value : ''
  }

  async function finish(updatedId: string | undefined) {
    if (updatedId === undefined) {
      options.form.resetForm()
      return
    }
    if (!options.detailAfterUpdate) {
      options.form.resetForm({ values: options.form.values as Resettable<Values, Output> })
      return
    }
    saved.value = true
    await router.push({ name: `${options.routeName}.detail`, params: { id: updatedId } })
  }

  async function save(values: Output) {
    const id = options.id()
    const updating = id !== undefined
    if (options.confirm && !(await options.confirm(updating))) {
      return false
    }
    if (updating) {
      await options.update(id, values)
    } else {
      await options.create(values)
    }
    const kind = updating ? 'updated' : 'created'
    showSuccess(`${options.entity}.toast.${kind}`, `${options.entity}.toast.${kind}-detail`, true, {
      name: recordName(),
    })
    await finish(id)
    return !updating
  }

  const onSubmit = options.form.handleSubmit(
    async (values) => {
      submitting.value = true
      let created = false
      try {
        await run(async () => {
          created = await save(values)
        })
      } finally {
        submitting.value = false
      }
      if (created) {
        await nextTick(focusFirstControl)
      }
    },
    () => nextTick(focusFirstInvalidControl),
  )

  const removeGuard = router.beforeEach((to) => {
    if (saved.value || !dirty.value || isPublicRoute(to)) {
      return true
    }
    return confirmDiscard(recordName())
  })

  watch(() => options.form.values, clearFields, { deep: true })

  onMounted(() => {
    const id = options.id()
    if (id !== undefined) {
      return run(() => load(id))
    }
  })

  onBeforeUnmount(removeGuard)

  return { messages, fields, submitting, loadingRecord, dirty, changeToList, onSubmit, run }
}
