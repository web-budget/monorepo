<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Laptop,
  MonitorSmartphone,
  Smartphone,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import GoogleNotice from '@/components/account/GoogleNotice.vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useAuthStore } from '@/stores/auth'
import { useTrustedDevicesStore } from '@/stores/trustedDevices'
import type { TrustedDeviceView } from '@/types'

type Pending = { kind: 'one'; device: TrustedDeviceView } | { kind: 'all' }

const DEVICES_PER_PAGE = 3
const MOBILE_LABEL = /iphone|android|ipad|mobile/i

const auth = useAuthStore()
const store = useTrustedDevicesStore()
const { devices, loading } = storeToRefs(store)
const { messages, run } = useServerErrors()
const { showSuccess } = useNotification()

const pending = ref<Pending | null>(null)
const loaded = ref(false)
const page = ref(1)

const TOTP_BADGES = { active: 'approved', pending: 'pending', inactive: 'neutral' } as const

const totpEnabled = computed(() => auth.session?.totpEnabled === true)
const googleLinked = computed(() => auth.session?.googleLinked === true)
const totpStatus = computed(() => {
  if (totpEnabled.value) {
    return 'active'
  }
  return auth.session?.totpRequired === true ? 'pending' : 'inactive'
})
const totpHelp = computed(() => {
  if (totpStatus.value === 'active') {
    return googleLinked.value ? 'help-google' : 'help'
  }
  return totpStatus.value === 'pending' ? 'pending-help' : 'not-required'
})
const pageCount = computed(() => Math.max(1, Math.ceil(devices.value.length / DEVICES_PER_PAGE)))
const currentPage = computed(() => Math.min(page.value, pageCount.value))
const firstIndex = computed(() => (currentPage.value - 1) * DEVICES_PER_PAGE)
const shownDevices = computed(() =>
  devices.value.slice(firstIndex.value, firstIndex.value + DEVICES_PER_PAGE),
)

const pendingTitle = computed(() =>
  pending.value?.kind === 'one'
    ? { key: 'devices.revoke.title', params: { label: pending.value.device.label } }
    : { key: 'devices.revoke-all.title', params: {} },
)

function iconOf(device: TrustedDeviceView) {
  return MOBILE_LABEL.test(device.label) ? Smartphone : Laptop
}

onMounted(async () => {
  if (auth.session?.hasPassword && totpEnabled.value) {
    await run(() => store.findAll())
  }
  loaded.value = true
})

async function confirmRevocation() {
  const target = pending.value as Pending
  const revoked = await run(() =>
    target.kind === 'one' ? store.revoke(target.device.id) : store.revokeAll(),
  )
  if (revoked) {
    showSuccess(target.kind === 'one' ? 'devices.toast.revoked' : 'devices.toast.revoked-all')
  }
  pending.value = null
}
</script>

<template>
  <GoogleNotice v-if="!auth.session?.hasPassword" class="m-5 self-start max-md:m-4" />
  <div v-else class="min-h-0 overflow-auto p-5 max-md:p-4">
    <div v-if="pending" class="grid gap-4" data-slot="revoke-panel">
      <div class="grid gap-1.5">
        <p class="text-base font-semibold">{{ $t(pendingTitle.key, pendingTitle.params) }}</p>
        <p class="text-muted-foreground text-sm">
          {{
            $t(
              pending.kind === 'one'
                ? 'devices.revoke.description'
                : 'devices.revoke-all.description',
            )
          }}
        </p>
      </div>
      <div class="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" :disabled="loading" @click="pending = null">
          {{ $t('form.cancel') }}
        </Button>
        <Button
          type="button"
          variant="destructive"
          :disabled="loading"
          data-slot="confirm-revoke"
          @click="confirmRevocation"
        >
          {{ $t('devices.revoke.action') }}
        </Button>
      </div>
    </div>
    <div v-else class="grid gap-5">
      <div class="grid gap-1">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-medium">{{ $t('account.security.two-factor') }}</p>
          <Badge :variant="TOTP_BADGES[totpStatus]" data-slot="two-factor-status">
            {{ $t(`account.security.${totpStatus}`) }}
          </Badge>
        </div>
        <p class="text-muted-foreground text-xs">
          {{ $t(`account.security.${totpHelp}`) }}
        </p>
      </div>
      <div v-if="totpEnabled" class="border-border grid gap-2 border-t pt-5" data-slot="devices">
        <div class="flex items-center justify-between gap-3">
          <div class="grid gap-0.5">
            <p class="text-sm font-medium">{{ $t('devices.title') }}</p>
            <p v-if="devices.length > 0" class="text-muted-foreground text-xs">
              {{ $t('account.security.devices-help') }}
            </p>
          </div>
          <Button
            v-if="devices.length > 0"
            type="button"
            variant="outline"
            size="sm"
            class="text-destructive hover:text-destructive shrink-0"
            @click="pending = { kind: 'all' }"
          >
            {{ $t('devices.revoke-all.action') }}
          </Button>
        </div>
        <ServerErrorAlert :messages="messages" />
        <div v-if="!loaded" class="grid gap-2" data-slot="devices-loading">
          <Skeleton class="h-14 w-full" />
          <Skeleton class="h-14 w-full" />
        </div>
        <div v-else-if="devices.length > 0" class="grid gap-2">
          <ul class="border-border divide-border divide-y rounded-lg border">
            <li
              v-for="device in shownDevices"
              :key="device.id"
              class="flex items-center gap-3 px-4 py-3"
            >
              <component :is="iconOf(device)" class="text-muted-foreground size-5 shrink-0" />
              <div class="grid min-w-0 flex-1 gap-0.5">
                <span class="truncate font-medium">{{ device.label }}</span>
                <span class="text-muted-foreground text-xs">
                  {{
                    $t('devices.dates', {
                      lastUsed: $d(new Date(device.lastUsedOn), 'short'),
                      created: $d(new Date(device.createdOn), 'short'),
                    })
                  }}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive"
                @click="pending = { kind: 'one', device }"
              >
                {{ $t('devices.revoke.action') }}
              </Button>
            </li>
          </ul>
          <div
            v-if="devices.length > DEVICES_PER_PAGE"
            class="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs"
            data-slot="devices-pager"
          >
            <span class="font-mono tabular-nums">
              {{
                $t('items-table.footer.range', {
                  first: firstIndex + 1,
                  last: firstIndex + shownDevices.length,
                  total: devices.length,
                })
              }}
            </span>
            <Pagination
              :total="devices.length"
              :items-per-page="DEVICES_PER_PAGE"
              :page="currentPage"
              :sibling-count="1"
              show-edges
              class="mx-0 w-auto"
              @update:page="page = $event"
            >
              <PaginationContent v-slot="{ items }">
                <PaginationFirst :aria-label="$t('items-table.pagination.first')">
                  <ChevronsLeft />
                </PaginationFirst>
                <PaginationPrevious :aria-label="$t('items-table.pagination.previous')">
                  <ChevronLeft />
                </PaginationPrevious>
                <template v-for="(item, index) in items" :key="index">
                  <PaginationItem
                    v-if="item.type === 'page'"
                    :value="item.value"
                    :is-active="item.value === currentPage"
                  >
                    {{ item.value }}
                  </PaginationItem>
                  <PaginationEllipsis v-else :index="index" />
                </template>
                <PaginationNext :aria-label="$t('items-table.pagination.next')">
                  <ChevronRight />
                </PaginationNext>
                <PaginationLast :aria-label="$t('items-table.pagination.last')">
                  <ChevronsRight />
                </PaginationLast>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
        <div
          v-else
          class="border-border grid justify-items-center gap-2 rounded-md border border-dashed px-6 py-8 text-center"
          data-slot="devices-empty"
        >
          <MonitorSmartphone class="text-muted-foreground size-6" />
          <p class="font-medium">{{ $t('devices.empty.title') }}</p>
          <p class="text-muted-foreground text-sm">{{ $t('devices.empty.description') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
