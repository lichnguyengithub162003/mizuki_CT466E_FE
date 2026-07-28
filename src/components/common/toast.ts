import { inject, type InjectionKey } from 'vue'

export type ToastVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

export interface ToastInput {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

export interface ToastItem extends Required<Pick<ToastInput, 'title' | 'variant' | 'duration'>> {
  id: string
  description?: string
}

export interface ToastController {
  toast: (input: ToastInput) => string
  dismiss: (id: string) => void
}

export const toastKey: InjectionKey<ToastController> = Symbol('mizuki-toast')

export function useToast(): ToastController {
  const controller = inject(toastKey)
  if (!controller) {
    throw new Error('useToast must be used inside BaseToastProvider')
  }
  return controller
}
