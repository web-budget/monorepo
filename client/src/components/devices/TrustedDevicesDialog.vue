<script setup lang="ts">
import { Laptop, MonitorSmartphone, Smartphone } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import ServerErrorAlert from '@/components/forms/ServerErrorAlert.vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotification } from '@/composables/useNotification'
import { useServerErrors } from '@/composables/useServerErrors'
import { useTrustedDevicesDialog } from '@/composables/useTrustedDevicesDialog'
import { useTrustedDevicesStore } from '@/stores/trustedDevices'
import type { TrustedDeviceView } from '@/types'

type Pending = { kind: 'one'; device: TrustedDeviceView } | { kind: 'all' }

const MOBILE_LABEL = /iphone|android|ipad|mobile/i

const store = useTrustedDevicesStore()
const { devices, loading } = storeToRefs(store)
const { open, close } = useTrustedDevicesDialog()
const { messages, run } = useServerErrors()
const { showSuccess } = useNotification()

const pending = ref<Pending | null>(null)
const loaded = ref(false)

const pendingTitle = computed(() =>
  pending.value?.kind === 'one'
    ? { key: 'devices.revoke.title', params: { label: pending.value.device.label } }
    : { key: 'devices.revoke-all.title', params: {} },
)

function iconOf(device: TrustedDeviceView) {
  return MOBILE_LABEL.test(device.label) ? Smartphone : Laptop
}

watch(open, async (isOpen) => {
  pending.value = null
  loaded.value = false
  if (isOpen) {
    await run(() => store.findAll())
    loaded.value = true
  }
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
  <Dialog :open="open" @update:open="(isOpen) => !isOpen && close()">
    <DialogContent class="sm:max-w-lg">
      <template v-if="pending">
        <DialogHeader>
          <DialogTitle>{{ $t(pendingTitle.key, pendingTitle.params) }}</DialogTitle>
          <DialogDescription>
            {{
              $t(
                pending.kind === 'one'
                  ? 'devices.revoke.description'
                  : 'devices.revoke-all.description',
              )
            }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
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
        </DialogFooter>
      </template>
      <template v-else>
        <DialogHeader>
          <DialogTitle>{{ $t('devices.title') }}</DialogTitle>
          <DialogDescription>
            {{
              $t(devices.length > 0 ? 'devices.description-with-devices' : 'devices.description')
            }}
          </DialogDescription>
        </DialogHeader>
        <ServerErrorAlert :messages="messages" />
        <div v-if="!loaded" class="grid gap-2" data-slot="devices-loading">
          <Skeleton class="h-14 w-full" />
          <Skeleton class="h-14 w-full" />
        </div>
        <ul
          v-else-if="devices.length > 0"
          class="border-border divide-border divide-y rounded-lg border"
        >
          <li v-for="device in devices" :key="device.id" class="flex items-center gap-3 px-4 py-3">
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
          v-else
          class="border-border grid justify-items-center gap-2 rounded-md border border-dashed px-6 py-8 text-center"
          data-slot="devices-empty"
        >
          <MonitorSmartphone class="text-muted-foreground size-6" />
          <p class="font-medium">{{ $t('devices.empty.title') }}</p>
          <p class="text-muted-foreground text-sm">{{ $t('devices.empty.description') }}</p>
        </div>
        <DialogFooter class="sm:justify-between">
          <Button
            v-if="devices.length > 0"
            type="button"
            variant="outline"
            class="text-destructive hover:text-destructive"
            @click="pending = { kind: 'all' }"
          >
            {{ $t('devices.revoke-all.action') }}
          </Button>
          <Button type="button" class="sm:ml-auto" @click="close()">{{
            $t('devices.close')
          }}</Button>
        </DialogFooter>
      </template>
    </DialogContent>
  </Dialog>
</template>
