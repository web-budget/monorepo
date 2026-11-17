import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { apiClient } from './api/client'
import router from './router'
import i18n from './locales'
import { installApiErrorHandler } from './plugins/apiErrorHandler'
import { installZodErrorMap } from './schemas/zodErrorMap'
import { useAppearanceStore } from './stores/appearance'

import '@/assets/theme.css'
import 'vue-sonner/style.css'

const app = createApp(App)

const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

useAppearanceStore(pinia)
installZodErrorMap()
installApiErrorHandler(apiClient, router)

app.mount('#app')
