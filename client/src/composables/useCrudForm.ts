import type { FormContext, GenericObject } from 'vee-validate'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDiscardGuard } from '@/composables/useDiscardGuard'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'

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
  redirectToDetail?: boolean
}

function focusFirstInvalidControl() {
  document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus()
}

export function useCrudForm<Values extends GenericObject, Output extends GenericObject, Entity>(
  options: CrudFormOptions<Values, Output, Entity>,
) {
  const router = useRouter()
  const { showSuccess } = useNotification()
  const { messages, fields, clearFields, run } = useServerErrors()

  const submitting = ref(false)
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

  const { saved } = useDiscardGuard(() => dirty.value, recordName)

  async function finish(id: string | undefined, updating: boolean) {
    if (!options.redirectToDetail) {
      options.form.resetForm(
        updating ? { values: options.form.values as Resettable<Values, Output> } : undefined,
      )
      return
    }
    saved.value = true
    await (id
      ? router.push({ name: `${options.routeName}.detail`, params: { id } })
      : changeToList())
  }

  async function save(values: Output) {
    const id = options.id()
    const updating = id !== undefined
    if (options.confirm && !(await options.confirm(updating))) {
      return
    }
    let savedId: string
    if (updating) {
      await options.update(id, values)
      savedId = id
    } else {
      savedId = await options.create(values)
    }
    const kind = updating ? 'updated' : 'created'
    showSuccess(`${options.entity}.toast.${kind}`, `${options.entity}.toast.${kind}-detail`, true, {
      name: recordName(),
    })
    await finish(savedId, updating)
  }

  const onSubmit = options.form.handleSubmit(
    async (values) => {
      submitting.value = true
      try {
        await run(() => save(values))
      } finally {
        submitting.value = false
      }
    },
    () => nextTick(focusFirstInvalidControl),
  )

  watch(() => options.form.values, clearFields, { deep: true })

  onMounted(() => {
    const id = options.id()
    if (id !== undefined) {
      return run(() => load(id))
    }
  })

  return { messages, fields, submitting, loadingRecord, dirty, changeToList, onSubmit, run }
}
