<script setup lang="ts">
import { CalendarClock, CalendarRange } from 'lucide-vue-next'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useNotification } from '@/composables/useNotification'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const { showSuccess } = useNotification()

async function toggle(enabled: boolean) {
  try {
    await auth.changeDueDateNotices(enabled)
  } catch {
    return
  }
  showSuccess('account.notifications.saved', `account.notifications.saved-${enabled ? 'on' : 'off'}`)
}
</script>

<template>
  <div class="min-h-0 overflow-auto p-5 max-md:p-4">
    <div class="grid gap-4">
      <Label class="flex items-start gap-3 font-normal">
        <Switch
          class="mt-0.5"
          :model-value="auth.session!.dueDateNotices"
          @update:model-value="toggle"
        />
        <span class="grid gap-0.5">
          <span class="text-sm font-medium">{{ $t('account.notifications.label') }}</span>
          <span class="text-muted-foreground text-xs">{{
            $t(`account.notifications.${auth.session!.dueDateNotices ? 'on' : 'off'}`)
          }}</span>
        </span>
      </Label>
      <ul class="text-muted-foreground grid gap-2 text-sm">
        <li class="flex gap-2">
          <CalendarClock class="mt-0.5 size-4 shrink-0" />
          <span
            ><b class="text-foreground font-medium">{{ $t('account.notifications.daily-lead') }}</b>
            {{ $t('account.notifications.daily') }}</span
          >
        </li>
        <li class="flex gap-2">
          <CalendarRange class="mt-0.5 size-4 shrink-0" />
          <span
            ><b class="text-foreground font-medium">{{ $t('account.notifications.weekly-lead') }}</b>
            {{ $t('account.notifications.weekly') }}</span
          >
        </li>
      </ul>
    </div>
  </div>
</template>
