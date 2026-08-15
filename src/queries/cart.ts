import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { QueryClient, useMutation, useQuery } from '@tanstack/vue-query'
import { addCartItem, getCustomerCart, removeCartItem, selectCartBranch, updateCartItem } from '@/api/cartApi'
import type { CustomerCart } from '@/types/cart'

const cartQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0 } } })
const cartKey = (userId: number) => ['customer-cart', userId] as const

export function useCustomerCartQuery(userId: MaybeRefOrGetter<number | null>) {
  const normalizedUserId = computed(() => toValue(userId))
  return useQuery({
    queryKey: computed(() => cartKey(normalizedUserId.value ?? 0)),
    queryFn: getCustomerCart,
    enabled: computed(() => normalizedUserId.value !== null),
  }, cartQueryClient)
}

function useCartMutation<TVariables>(
  userId: MaybeRefOrGetter<number | null>,
  mutationFn: (variables: TVariables) => Promise<CustomerCart>,
) {
  const normalizedUserId = computed(() => toValue(userId))
  return useMutation({
    mutationFn,
    onMutate: () => normalizedUserId.value,
    onSuccess: (cart, _variables, userId) => {
      if (userId !== null) cartQueryClient.setQueryData(cartKey(userId), cart)
    },
  }, cartQueryClient)
}

export const useAddCartItemMutation = (userId: MaybeRefOrGetter<number | null>) => useCartMutation(userId, ({ productVariantId, quantity }: { productVariantId: number; quantity: number }) => addCartItem(productVariantId, quantity))
export const useUpdateCartItemMutation = (userId: MaybeRefOrGetter<number | null>) => useCartMutation(userId, ({ itemId, quantity }: { itemId: number; quantity: number }) => updateCartItem(itemId, quantity))
export const useRemoveCartItemMutation = (userId: MaybeRefOrGetter<number | null>) => useCartMutation(userId, (itemId: number) => removeCartItem(itemId))
export const useSelectCartBranchMutation = (userId: MaybeRefOrGetter<number | null>) => useCartMutation(userId, (branchId: number) => selectCartBranch(branchId))
