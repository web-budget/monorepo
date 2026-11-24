import { onMounted, ref } from 'vue'

export function useModuleCounts<T extends number | string = number>(
  sources: Record<string, () => Promise<T | null>>,
) {
  const counts = ref<Record<string, T | null>>({})

  onMounted(() =>
    Promise.all(
      Object.entries(sources).map(async ([destination, count]) => {
        const total = await count()
        counts.value = { ...counts.value, [destination]: total }
      }),
    ),
  )

  return { counts }
}
