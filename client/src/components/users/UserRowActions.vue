<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { Ellipsis, KeyRound, Pencil, Trash2 } from 'lucide-vue-next'
import { ref } from 'vue'
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

defineProps<{ user: UserView; own: boolean }>()

const emit = defineEmits<{ edit: []; resetPassword: []; remove: [] }>()

const compact = useMediaQuery('(max-width: 767px)')
const sheetOpen = ref(false)

function choose(action: 'edit' | 'resetPassword' | 'remove') {
  sheetOpen.value = false
  if (action === 'edit') {
    emit('edit')
  } else if (action === 'resetPassword') {
    emit('resetPassword')
  } else {
    emit('remove')
  }
}
</script>

<template>
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
        type="button"
        variant="ghost"
        class="h-10 justify-start"
        :disabled="own"
        @click="choose('edit')"
      >
        <Pencil />{{ $t('crud.actions.edit') }}
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
      <DropdownMenuItem :disabled="own" @select="emit('edit')">
        <Pencil />{{ $t('crud.actions.edit') }}
      </DropdownMenuItem>
      <DropdownMenuItem :disabled="own" @select="emit('resetPassword')">
        <KeyRound />{{ $t('users.password.action') }}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem :disabled="own" variant="destructive" @select="emit('remove')">
        <Trash2 />{{ $t('crud.actions.remove') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
