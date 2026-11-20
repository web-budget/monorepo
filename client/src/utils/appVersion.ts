export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev'

export const APP_VERSION_LABEL = APP_VERSION === 'dev' ? APP_VERSION : `v${APP_VERSION}`
