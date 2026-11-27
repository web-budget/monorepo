<script setup lang="ts">
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Box,
  Ellipsis,
  History,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-vue-next'
import CurrencyDisplay from '@/components/common/CurrencyDisplay.vue'
import CompartmentGoalInfo from '@/components/compartments/CompartmentGoalInfo.vue'
import CompartmentTypeBadge from '@/components/compartments/CompartmentTypeBadge.vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CompartmentView } from '@/types'

defineProps<{ compartments: CompartmentView[]; walletActive: boolean }>()

const emit = defineEmits<{
  deposit: [compartmentId?: string]
  withdraw: [compartmentId?: string]
  create: []
  history: [compartmentId: string]
  edit: [compartmentId: string]
  remove: [compartmentId: string]
}>()
</script>

<template>
  <Card class="gap-0 overflow-hidden py-0" data-slot="compartments-card">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3.5">
      <h2 class="text-base font-semibold">{{ $t('compartment.title') }}</h2>
      <div class="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="!walletActive || compartments.length === 0"
          :title="walletActive ? undefined : $t('compartment.actions.inactive-wallet')"
          @click="emit('deposit')"
        >
          <ArrowDownToLine />{{ $t('compartment.actions.deposit') }}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          :disabled="!walletActive || compartments.length === 0"
          :title="walletActive ? undefined : $t('compartment.actions.inactive-wallet')"
          @click="emit('withdraw')"
        >
          <ArrowUpFromLine />{{ $t('compartment.actions.withdraw') }}
        </Button>
        <Button
          type="button"
          size="sm"
          :disabled="!walletActive"
          :title="walletActive ? undefined : $t('compartment.actions.inactive-wallet')"
          @click="emit('create')"
        >
          <Plus />{{ $t('compartment.actions.create') }}
        </Button>
      </div>
    </div>
    <div
      v-if="compartments.length === 0"
      class="grid justify-items-center gap-2 px-6 py-12 text-center"
      data-slot="compartments-empty"
    >
      <Box class="text-muted-foreground size-6" />
      <p class="font-medium">{{ $t('compartment.empty') }}</p>
      <Button v-if="walletActive" type="button" variant="outline" size="sm" @click="emit('create')">
        <Plus />{{ $t('compartment.actions.create') }}
      </Button>
    </div>
    <div v-else>
      <div
        v-for="compartment in compartments"
        :key="compartment.id"
        class="hover:bg-muted/60 relative grid cursor-pointer items-center gap-x-4 gap-y-2 border-b px-5 py-3.5 last:border-b-0 md:grid-cols-[minmax(0,1.3fr)_9.5rem_minmax(0,1.7fr)_auto]"
        data-slot="compartment-row"
        @click="emit('history', compartment.id)"
      >
        <div class="grid min-w-0 gap-1 pr-10 md:pr-0">
          <span class="truncate font-medium">{{ compartment.name }}</span>
          <span><CompartmentTypeBadge :type="compartment.type" /></span>
        </div>
        <div class="md:text-right">
          <CurrencyDisplay :value="compartment.balance" bare class="text-base font-semibold" />
        </div>
        <div class="min-w-0"><CompartmentGoalInfo :compartment="compartment" /></div>
        <div class="absolute right-3 md:static" @click.stop>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                :aria-label="$t('compartment.actions.more', { name: compartment.name })"
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="min-w-44">
              <DropdownMenuItem :disabled="!walletActive" @select="emit('deposit', compartment.id)">
                <ArrowDownToLine />{{ $t('compartment.actions.deposit') }}
              </DropdownMenuItem>
              <DropdownMenuItem
                :disabled="!walletActive"
                @select="emit('withdraw', compartment.id)"
              >
                <ArrowUpFromLine />{{ $t('compartment.actions.withdraw') }}
              </DropdownMenuItem>
              <DropdownMenuItem @select="emit('history', compartment.id)">
                <History />{{ $t('compartment.actions.history') }}
              </DropdownMenuItem>
              <DropdownMenuItem :disabled="!walletActive" @select="emit('edit', compartment.id)">
                <Pencil />{{ $t('compartment.actions.edit') }}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                :disabled="!walletActive"
                @select="emit('remove', compartment.id)"
              >
                <Trash2 />{{ $t('compartment.actions.remove') }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  </Card>
</template>
