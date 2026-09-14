import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { registerAppProviders } from '@/providers/appProviders'
import { router } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores/pinia'
import { setUnauthorizedHandler } from '@/api/clients'

const app = createApp(App)

registerAppProviders(app)
await useAuthStore(pinia).restoreSession()
setUnauthorizedHandler(() => {
  if (!router.currentRoute.value.path.startsWith('/admin')) return
  const redirect = router.currentRoute.value.fullPath
  useAuthStore(pinia).clearSession()
  void router.replace({ name: 'admin-login', query: { redirect } })
})
await router.isReady()
app.mount('#app')
