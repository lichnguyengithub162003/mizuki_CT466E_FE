import type { App } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { router } from '@/router'
import { pinia } from '@/stores/pinia'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

export function registerAppProviders(app: App): void {
  app.use(pinia)
  app.use(VueQueryPlugin, { queryClient })
  app.use(router)
}
