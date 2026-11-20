import { onMounted, ref } from 'vue'

export function useModuleCounts(sources: Record<string, () => Promise<number | null>>) {
  const counts = ref<Record<string, number | null>>({})

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
