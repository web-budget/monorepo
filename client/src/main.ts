import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { apiClient } from './api/client'
import router from './router'
import i18n from './locales'
import { installApiErrorHandler } from './plugins/apiErrorHandler'
import { installZodErrorMap } from './schemas/zodErrorMap'
import { useAppearanceStore } from './stores/appearance'
import { useLanguageStore } from './stores/language'

import '@fontsource-variable/ibm-plex-sans'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@/assets/theme.css'
import 'vue-sonner/style.css'

const app = createApp(App)

const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

useAppearanceStore(pinia)
useLanguageStore(pinia)
installZodErrorMap()
installApiErrorHandler(apiClient, router)

app.mount('#app')
