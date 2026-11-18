<script setup lang="ts">
import { ChevronsUpDown, X } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { SelectedOption } from '@/schemas/fields'

const MINIMUM_QUERY_LENGTH = 2

withDefaults(
  defineProps<{
    name: string
    label: string
    options: SelectedOption[]
    placeholder: string
    emptyMessage: string
    disabled?: boolean
    required?: boolean
  }>(),
  { disabled: false, required: false },
)

const emit = defineEmits<{ search: [query: string] }>()

const open = ref(false)
const query = ref('')

watch(query, (text) => {
  if (text.length >= MINIMUM_QUERY_LENGTH) {
    emit('search', text)
  }
})

watch(open, (isOpen) => {
  if (!isOpen) {
    query.value = ''
  }
})

const searching = computed(() => query.value.length >= MINIMUM_QUERY_LENGTH)

function choose(option: SelectedOption, setValue: (value: SelectedOption) => void) {
  setValue(option)
  open.value = false
}
</script>

<template>
  <FormField v-slot="{ value, setValue }" :name="name">
    <FormItem>
      <FormLabel :required="required">{{ label }}</FormLabel>
      <Popover v-model:open="open">
        <div class="flex gap-2">
          <PopoverTrigger as-child>
            <FormControl>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                class="flex-1 justify-between font-normal"
                :disabled="disabled"
                :aria-expanded="open"
                :data-field="name"
              >
                <span :class="{ 'text-muted-foreground': !value }">
                  {{ value ? value.label : placeholder }}
                </span>
                <ChevronsUpDown class="size-4 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <Button
            v-if="value && !disabled"
            type="button"
            variant="ghost"
            size="icon"
            :aria-label="$t('form.clear-selection')"
            @click="setValue(null)"
          >
            <X />
          </Button>
        </div>
        <PopoverContent class="w-(--reka-popover-trigger-width) p-2">
          <Input v-model="query" :placeholder="placeholder" />
          <ul v-if="searching" role="listbox" class="mt-2 space-y-1">
            <li v-if="options.length === 0" class="text-muted-foreground p-2 text-sm">
              {{ emptyMessage }}
            </li>
            <li v-for="option in options" :key="option.id">
              <button
                type="button"
                role="option"
                :aria-selected="value?.id === option.id"
                class="hover:bg-accent w-full rounded-sm px-2 py-1.5 text-left text-sm"
                @click="choose(option, setValue)"
              >
                {{ option.label }}
              </button>
            </li>
          </ul>
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
