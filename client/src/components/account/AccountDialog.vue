<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import {
  ArrowLeft,
  ChevronRight,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-vue-next'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import PasswordTab from '@/components/account/PasswordTab.vue'
import PreferencesTab from '@/components/account/PreferencesTab.vue'
import ProfileTab from '@/components/account/ProfileTab.vue'
import SecurityTab from '@/components/account/SecurityTab.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useAccountDialog, type AccountTab } from '@/composables/useAccountDialog'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const { open, tab, select, close } = useAccountDialog()
const compact = useMediaQuery('(max-width: 767px)')

const tabs = [
  { id: 'profile', icon: UserRound },
  { id: 'preferences', icon: SlidersHorizontal },
  { id: 'password', icon: KeyRound },
  { id: 'security', icon: ShieldCheck },
] as const

const bodies = {
  profile: ProfileTab,
  preferences: PreferencesTab,
  password: PasswordTab,
  security: SecurityTab,
}

watch(
  () => auth.session,
  (session) => {
    if (!session) {
      close()
    }
  },
)

const currentTab = computed<AccountTab | null>(
  () => tab.value ?? (compact.value ? null : 'profile'),
)

const header = computed(() => {
  const email = auth.session?.email
  switch (currentTab.value) {
    case 'profile':
      return { title: t('account.tabs.profile'), description: t('account.profile.description') }
    case 'preferences':
      return { title: t('account.tabs.preferences'), description: '' }
    case 'password':
      return auth.session?.hasPassword
        ? {
            title: t('account.password.title'),
            description: t('account.password.description', { email }),
          }
        : { title: t('account.tabs.password'), description: '' }
    case 'security':
      return { title: t('account.tabs.security'), description: '' }
    default:
      return { title: t('account.title'), description: email, small: true }
  }
})
</script>

<template>
  <Dialog :open="open" @update:open="(isOpen) => !isOpen && close()">
    <DialogContent
      :show-close-button="false"
      class="h-[600px] max-h-[calc(100svh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[700px] md:grid-cols-[210px_minmax(0,1fr)] max-md:top-0 max-md:left-0 max-md:h-full max-md:max-h-none max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:rounded-none max-md:border-0"
      data-slot="account-dialog"
    >
      <nav
        class="border-border bg-sidebar grid content-start gap-0.5 border-r p-2 max-md:hidden"
        :aria-label="$t('account.title')"
      >
        <div class="grid gap-0.5 px-2 pt-1.5 pb-3">
          <span class="text-sm font-semibold">{{ $t('account.title') }}</span>
          <span class="text-muted-foreground truncate text-xs">{{ auth.session?.email }}</span>
        </div>
        <button
          v-for="item in tabs"
          :key="item.id"
          type="button"
          class="text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-ring flex h-8 items-center gap-2 rounded-md px-2 text-left text-sm outline-hidden focus-visible:ring-2 [&_svg]:size-4 [&_svg]:shrink-0"
          :class="
            currentTab === item.id
              ? 'font-semibold [&_svg]:text-sidebar-foreground'
              : '[&_svg]:text-muted-foreground'
          "
          :aria-current="currentTab === item.id ? 'page' : undefined"
          @click="select(item.id)"
        >
          <component :is="item.icon" />
          <span :class="{ marker: currentTab === item.id }">{{
            $t(`account.tabs.${item.id}`)
          }}</span>
        </button>
      </nav>
      <div class="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
        <div
          class="border-border flex items-start justify-between gap-2 border-b px-5 py-3.5 max-md:px-4"
        >
          <div class="flex items-start gap-2">
            <Button
              v-if="compact && currentTab"
              type="button"
              variant="ghost"
              size="icon-sm"
              class="-ml-2"
              :aria-label="$t('account.back')"
              @click="select(null)"
            >
              <ArrowLeft />
            </Button>
            <div class="grid gap-0.5">
              <DialogTitle class="leading-normal">{{ header.title }}</DialogTitle>
              <DialogDescription
                :class="[
                  header.description ? 'text-muted-foreground' : 'sr-only',
                  header.small ? 'text-xs' : 'text-sm',
                ]"
              >
                {{ header.description || header.title }}
              </DialogDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-label="$t('account.close')"
            @click="close()"
          >
            <X />
          </Button>
        </div>
        <component :is="bodies[currentTab]" v-if="currentTab" :key="currentTab" />
        <ul v-else class="divide-border min-h-0 divide-y overflow-auto" data-slot="account-tabs">
          <li v-for="item in tabs" :key="item.id">
            <button
              type="button"
              class="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm"
              @click="select(item.id)"
            >
              <component :is="item.icon" class="text-muted-foreground size-4" />
              <span class="flex-1">{{ $t(`account.tabs.${item.id}`) }}</span>
              <ChevronRight class="text-muted-foreground size-4" />
            </button>
          </li>
        </ul>
      </div>
    </DialogContent>
  </Dialog>
</template>
