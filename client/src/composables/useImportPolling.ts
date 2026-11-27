import { onBeforeUnmount, onMounted } from 'vue'
import { useImportsStore } from '@/stores/imports'
import { useServerErrors } from '@/composables/useServerErrors'

export const IMPORT_POLLING_INTERVAL = 2000

export function useImportPolling(id: () => string) {
  const store = useImportsStore()
  const errors = useServerErrors()
  let timer: ReturnType<typeof setTimeout> | undefined

  function stop() {
    clearTimeout(timer)
  }

  async function load() {
    stop()
    const loaded = await errors.run(() => store.findOne(id()))
    if (loaded && store.current?.status === 'PROCESSING') {
      timer = setTimeout(load, IMPORT_POLLING_INTERVAL)
    }
  }

  onMounted(load)
  onBeforeUnmount(stop)

  return { messages: errors.messages, reload: load }
}
