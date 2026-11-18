import { toast } from 'vue-sonner'
import i18n from '@/locales'
import type { ApiErrorNotice, LocalizedMessage } from '@/utils/apiErrorNotice'

const NOTIFICATION_DURATION = 4000

type Severity = 'success' | 'info' | 'warning' | 'error'

function translate(message: string, localize: boolean): string {
  return localize ? i18n.global.t(message) : message
}

function translateMessage({ key, params }: LocalizedMessage): string {
  return i18n.global.t(key, params ?? {})
}

function show(severity: Severity, title: string, detail: string | undefined, localize: boolean) {
  toast[severity](translate(title, localize), {
    description: detail === undefined ? undefined : translate(detail, localize),
    duration: NOTIFICATION_DURATION,
  })
}

export function useNotification() {
  function showSuccess(title: string, detail?: string, localize = true) {
    show('success', title, detail, localize)
  }

  function showInfo(title: string, detail?: string, localize = true) {
    show('info', title, detail, localize)
  }

  function showWarn(title: string, detail?: string, localize = true) {
    show('warning', title, detail, localize)
  }

  function showError(title: string, detail?: string, localize = true) {
    show('error', title, detail, localize)
  }

  function showApiNotice(notice: ApiErrorNotice) {
    const severity: Severity = notice.severity === 'warn' ? 'warning' : 'error'
    show(
      severity,
      translateMessage(notice.title),
      notice.details.map(translateMessage).join('\n'),
      false,
    )
  }

  return { showSuccess, showInfo, showWarn, showError, showApiNotice }
}
