import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { registerAppProviders } from '@/providers/appProviders'
import { router } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'

const app = createApp(App)

registerAppProviders(app)
await useAuthStore(pinia).restoreSession()
await router.isReady()
app.mount('#app')
