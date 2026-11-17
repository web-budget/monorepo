import type { FormContext, GenericObject } from 'vee-validate'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'

interface CrudFormOptions<Values extends GenericObject, Output extends GenericObject, Entity> {
  routeName: string
  notices: { created: string; updated: string }
  id: () => string | undefined
  form: Pick<FormContext<Values, Output>, 'handleSubmit' | 'setValues' | 'resetForm'>
  findOne: (id: string) => Promise<Entity>
  toFormValues: (entity: Entity) => Parameters<FormContext<Values, Output>['setValues']>[0]
  create: (values: Output) => Promise<void>
  update: (id: string, values: Output) => Promise<unknown>
}

export function useCrudForm<Values extends GenericObject, Output extends GenericObject, Entity>(
  options: CrudFormOptions<Values, Output, Entity>,
) {
  const router = useRouter()
  const { showSuccess } = useNotification()
  const { messages, run } = useServerErrors()

  function changeToList() {
    return router.push({ name: options.routeName })
  }

  async function load(id: string) {
    options.form.setValues(options.toFormValues(await options.findOne(id)))
  }

  const onSubmit = options.form.handleSubmit((values) =>
    run(async () => {
      const id = options.id()
      if (id !== undefined) {
        await options.update(id, values)
        showSuccess('notification.record-updated', options.notices.updated)
      } else {
        await options.create(values)
        showSuccess('notification.record-created', options.notices.created)
        options.form.resetForm()
      }
    }),
  )

  onMounted(() => {
    const id = options.id()
    if (id !== undefined) {
      return run(() => load(id))
    }
  })

  return { messages, changeToList, onSubmit, run }
}
