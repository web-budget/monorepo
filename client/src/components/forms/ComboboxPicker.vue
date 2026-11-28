<script setup lang="ts">
import { ChevronsUpDown, LoaderCircle } from 'lucide-vue-next'
import { computed, nextTick, ref, watch } from 'vue'
import {
  Combobox,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
} from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { filterOptions, splitLabel, type ComboboxOption } from '@/utils/comboboxSearch'

const NONE = '__none__'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  options: ComboboxOption[]
  placeholder?: string
  noneLabel?: string
  searchPlaceholder: string
  emptyMessage: string
  loadingMessage: string
  triggerLabel?: string
  disabled?: boolean
  loading?: boolean
}>()

const model = defineModel<string | null | undefined>({ required: true })

const open = ref(false)
const query = ref('')
const root = ref<{ highlightFirstItem?: () => void }>()

const searching = computed(() => query.value.trim() !== '')
const matches = computed(() => filterOptions(props.options, query.value))
const hasNone = computed(() => props.noneLabel !== undefined)
const showNone = computed(() => hasNone.value && !searching.value)

const selectedValue = computed(() => {
  if (model.value) {
    return model.value
  }
  return hasNone.value ? NONE : undefined
})

const selectedOption = computed(() => props.options.find((option) => option.value === model.value))

const triggerParts = computed(() => {
  if (selectedOption.value) {
    return splitLabel(selectedOption.value.label)
  }
  if (model.value === '' || model.value === null || model.value === undefined) {
    return hasNone.value && props.noneLabel
      ? [{ text: props.noneLabel, parent: false, matched: false }]
      : []
  }
  return []
})

const showsPlaceholder = computed(() => !props.loading && triggerParts.value.length === 0)

function choose(value: unknown) {
  model.value = value === NONE ? '' : (value as string)
}

watch(open, (isOpen) => {
  if (!isOpen) {
    query.value = ''
  }
})

watch(query, async () => {
  await nextTick()
  root.value?.highlightFirstItem?.()
})
</script>

<template>
  <Combobox
    ref="root"
    v-model:open="open"
    :model-value="selectedValue"
    :disabled="disabled || loading"
    ignore-filter
    @update:model-value="choose"
  >
    <ComboboxAnchor as-child>
      <ComboboxTrigger as-child>
        <button
          v-bind="$attrs"
          type="button"
          tabindex="0"
          :aria-label="triggerLabel"
          :aria-busy="loading || undefined"
          :class="
            cn(
              'border-input bg-card text-foreground focus-visible:border-ring focus-visible:ring-ring/40 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap transition-[border-color,box-shadow] duration-150 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
            )
          "
          @keydown.down.prevent="open = true"
        >
          <span class="min-w-0 flex-1 truncate text-left">
            <template v-if="loading">
              <span class="text-muted-foreground">{{ loadingMessage }}</span>
            </template>
            <template v-else-if="showsPlaceholder">
              <span class="text-muted-foreground">{{ placeholder }}</span>
            </template>
            <template v-else>
              <span
                v-for="(part, index) in triggerParts"
                :key="index"
                :class="{ 'text-muted-foreground': part.parent }"
                >{{ part.text }}</span
              >
            </template>
          </span>
          <LoaderCircle
            v-if="loading"
            class="text-muted-foreground size-4 shrink-0 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <ChevronsUpDown v-else class="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
        </button>
      </ComboboxTrigger>
    </ComboboxAnchor>
    <ComboboxList>
      <template #search>
        <ComboboxInput
          v-model="query"
          :display-value="() => ''"
          :placeholder="searchPlaceholder"
          :aria-label="searchPlaceholder"
        />
      </template>
      <template v-if="showNone">
        <ComboboxItem :value="NONE">{{ noneLabel }}</ComboboxItem>
        <ComboboxSeparator />
      </template>
      <ComboboxItem v-for="{ option, range } in matches" :key="option.value" :value="option.value">
        <span
          v-for="(part, index) in splitLabel(option.label, range)"
          :key="index"
          :class="[part.parent && 'text-muted-foreground', part.matched && 'font-semibold']"
          >{{ part.text }}</span
        >
      </ComboboxItem>
      <p v-if="matches.length === 0" class="text-muted-foreground px-2 py-6 text-center text-sm">
        {{ emptyMessage }}
      </p>
    </ComboboxList>
  </Combobox>
</template>
