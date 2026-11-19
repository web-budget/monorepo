<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import {
  Check,
  Ellipsis,
  Lock,
  LockOpen,
  KeyRound,
  Pencil,
  ShieldOff,
  Trash2,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import UserAvatar from '@/components/users/UserAvatar.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { UserView } from '@/types'

const props = defineProps<{ user: UserView; own: boolean }>()

const emit = defineEmits<{
  edit: []
  approve: []
  block: []
  unblock: []
  resetPassword: []
  resetTotp: []
  remove: []
}>()

type Action = 'edit' | 'approve' | 'block' | 'unblock' | 'resetPassword' | 'resetTotp' | 'remove'

const compact = useMediaQuery('(max-width: 767px)')
const sheetOpen = ref(false)

const pending = computed(() => props.user.status === 'PENDING')
const approved = computed(() => props.user.status === 'APPROVED')
const blocked = computed(() => props.user.status === 'BLOCKED')

function choose(action: Action) {
  sheetOpen.value = false
  ;(emit as (event: Action) => void)(action)
}
</script>

<template>
  <div class="flex items-center justify-end gap-1">
    <Button
      v-if="pending && !compact"
      type="button"
      variant="outline"
      size="sm"
      data-slot="approve-shortcut"
      @click="choose('approve')"
    >
      {{ $t('users.approve.shortcut') }}
    </Button>
    <Sheet v-if="compact" v-model:open="sheetOpen">
      <SheetTrigger as-child>
        <Button variant="ghost" size="icon-sm" :aria-label="$t('crud.actions.more')">
          <Ellipsis />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" class="gap-1 rounded-t-lg p-3 pb-5">
        <SheetHeader class="flex-row items-center gap-3 px-2 pt-4 pb-2">
          <UserAvatar :name="user.name" />
          <div class="grid min-w-0 gap-0.5 text-left">
            <SheetTitle class="truncate">{{ user.name }}</SheetTitle>
            <SheetDescription class="truncate text-xs">
              {{ own ? $t('users.own-account') : user.email }}
            </SheetDescription>
          </div>
        </SheetHeader>
        <Button
          v-if="pending"
          type="button"
          variant="ghost"
          class="h-10 justify-start"
          @click="choose('approve')"
        >
          <Check />{{ $t('users.approve.shortcut') }}
        </Button>
        <Button
          type="button"
          variant="ghost"
          class="h-10 justify-start"
          :disabled="own"
          @click="choose('edit')"
        >
          <Pencil />{{ $t('crud.actions.edit') }}
        </Button>
        <Button
          v-if="approved"
          type="button"
          variant="ghost"
          class="h-10 justify-start"
          :disabled="own"
          @click="choose('block')"
        >
          <Lock />{{ $t('users.block.menu') }}
        </Button>
        <Button
          v-if="blocked"
          type="button"
          variant="ghost"
          class="h-10 justify-start"
          :disabled="own"
          @click="choose('unblock')"
        >
          <LockOpen />{{ $t('users.unblock.menu') }}
        </Button>
        <Button
          type="button"
          variant="ghost"
          class="h-10 justify-start"
          :disabled="own"
          @click="choose('resetPassword')"
        >
          <KeyRound />{{ $t('users.password.action') }}
        </Button>
        <Button
          v-if="user.totpEnabled"
          type="button"
          variant="ghost"
          class="h-10 justify-start"
          :disabled="own"
          @click="choose('resetTotp')"
        >
          <ShieldOff />{{ $t('users.totp-reset.menu') }}
        </Button>
        <Button
          type="button"
          variant="ghost"
          class="text-destructive hover:text-destructive h-10 justify-start"
          :disabled="own"
          @click="choose('remove')"
        >
          <Trash2 />{{ $t('crud.actions.remove') }}
        </Button>
      </SheetContent>
    </Sheet>
    <DropdownMenu v-else>
      <DropdownMenuTrigger as-child>
        <Button variant="ghost" size="icon-sm" :aria-label="$t('crud.actions.more')">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="min-w-52">
        <DropdownMenuLabel>
          {{ own ? $t('users.own-account') : user.name }}
        </DropdownMenuLabel>
        <DropdownMenuItem v-if="pending" @select="emit('approve')">
          <Check />{{ $t('users.approve.shortcut') }}
        </DropdownMenuItem>
        <DropdownMenuItem :disabled="own" @select="emit('edit')">
          <Pencil />{{ $t('crud.actions.edit') }}
        </DropdownMenuItem>
        <DropdownMenuItem v-if="approved" :disabled="own" @select="emit('block')">
          <Lock />{{ $t('users.block.menu') }}
        </DropdownMenuItem>
        <DropdownMenuItem v-if="blocked" :disabled="own" @select="emit('unblock')">
          <LockOpen />{{ $t('users.unblock.menu') }}
        </DropdownMenuItem>
        <DropdownMenuItem :disabled="own" @select="emit('resetPassword')">
          <KeyRound />{{ $t('users.password.action') }}
        </DropdownMenuItem>
        <DropdownMenuItem v-if="user.totpEnabled" :disabled="own" @select="emit('resetTotp')">
          <ShieldOff />{{ $t('users.totp-reset.menu') }}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem :disabled="own" variant="destructive" @select="emit('remove')">
          <Trash2 />{{ $t('crud.actions.remove') }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
