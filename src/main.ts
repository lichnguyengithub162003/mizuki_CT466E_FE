import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { registerAppProviders } from '@/providers/appProviders'

const app = createApp(App)

registerAppProviders(app)
app.mount('#app')
