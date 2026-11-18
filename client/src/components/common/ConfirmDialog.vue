<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const { state, accept, cancel } = useConfirmDialog()
</script>

<template>
  <AlertDialog :open="state.open" @update:open="cancel()">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ state.options.title ?? $t('confirm.title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          {{ state.options.description ?? $t('notification.confirm-delete') }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="cancel()">
          {{ state.options.cancelLabel ?? $t('form.cancel') }}
        </AlertDialogCancel>
        <AlertDialogAction
          :class="
            state.options.destructive ? buttonVariants({ variant: 'destructive' }) : undefined
          "
          @click.capture="accept()"
        >
          {{ state.options.confirmLabel ?? $t('form.delete') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
