import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { QueryClient, useMutation, useQuery } from '@tanstack/vue-query'
import {
  addCustomerFavorite,
  getCustomerFavorites,
  removeCustomerFavorite,
} from '@/api/favoritesApi'
import { pinia } from '@/stores/pinia'
import { useBranchPreferenceStore } from '@/stores/branchPreference'
import type { CustomerFavorite } from '@/types/favorites'

const favoritesQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 0 } },
})
const favoritesKey = (userId: number, branchId: number | null) =>
  ['customer-favorites', userId, branchId] as const

function favoriteContext(userId: MaybeRefOrGetter<number | null>) {
  const branchStore = useBranchPreferenceStore(pinia)

  return {
    userId: computed(() => toValue(userId)),
    branchId: computed(() => branchStore.selectedBranchId),
  }
}

export function useCustomerFavoritesQuery(userId: MaybeRefOrGetter<number | null>) {
  const context = favoriteContext(userId)
  return useQuery({
    queryKey: computed(() => favoritesKey(context.userId.value ?? 0, context.branchId.value)),
    queryFn: () => getCustomerFavorites(context.branchId.value),
    enabled: computed(() => context.userId.value !== null),
  }, favoritesQueryClient)
}

export function useAddFavoriteMutation(userId: MaybeRefOrGetter<number | null>) {
  const context = favoriteContext(userId)
  return useMutation({
    mutationFn: (productId: number) => addCustomerFavorite(productId, context.branchId.value),
    onMutate: () => ({ userId: context.userId.value, branchId: context.branchId.value }),
    onSuccess: (favorite, _productId, mutationContext) => {
      if (mutationContext.userId === null) return
      favoritesQueryClient.setQueryData<CustomerFavorite[]>(
        favoritesKey(mutationContext.userId, mutationContext.branchId),
        (favorites = []) => [favorite, ...favorites.filter((item) => item.productId !== favorite.productId)],
      )
    },
  }, favoritesQueryClient)
}

export function useRemoveFavoriteMutation(userId: MaybeRefOrGetter<number | null>) {
  const context = favoriteContext(userId)
  return useMutation({
    mutationFn: async (productId: number) => {
      await removeCustomerFavorite(productId)
      return productId
    },
    onMutate: () => ({ userId: context.userId.value, branchId: context.branchId.value }),
    onSuccess: (productId, _variables, mutationContext) => {
      if (mutationContext.userId === null) return
      favoritesQueryClient.setQueryData<CustomerFavorite[]>(
        favoritesKey(mutationContext.userId, mutationContext.branchId),
        (favorites = []) => favorites.filter((item) => item.productId !== productId),
      )
    },
  }, favoritesQueryClient)
}
