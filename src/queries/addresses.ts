import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  setDefaultCustomerAddress,
  updateCustomerAddress,
} from '@/api/addressApi'
import type { CheckoutAddress, CheckoutAddressDraft } from '@/types/customer'

export const customerAddressKeys = {
  list: (userId: number) => ['customer-addresses', userId] as const,
}

export function useCustomerAddressesQuery(
  userId: MaybeRefOrGetter<number | null>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const resolvedUserId = computed(() => toValue(userId))
  const resolvedEnabled = computed(() => toValue(enabled))

  return useQuery({
    queryKey: computed(() => customerAddressKeys.list(resolvedUserId.value ?? 0)),
    queryFn: getCustomerAddresses,
    enabled: computed(() => resolvedEnabled.value && resolvedUserId.value !== null),
  })
}

function useAddressMutation(
  userId: MaybeRefOrGetter<number | null>,
  mutationFn: (draft: CheckoutAddressDraft) => Promise<CheckoutAddress>,
) {
  const queryClient = useQueryClient()
  const resolvedUserId = computed(() => toValue(userId))

  return useMutation({
    mutationFn,
    onMutate: () => resolvedUserId.value,
    onSuccess: async (savedAddress, _draft, id) => {
      if (id === null) return
      queryClient.setQueryData<CheckoutAddress[]>(
        customerAddressKeys.list(id),
        (addresses = []) => {
          const others = addresses
            .filter((address) => address.id !== savedAddress.id)
            .map((address) => savedAddress.isDefault ? { ...address, isDefault: false } : address)
          return [...others, savedAddress]
        },
      )
      await queryClient.invalidateQueries({ queryKey: customerAddressKeys.list(id) })
    },
  })
}

export function useCreateCustomerAddressMutation(userId: MaybeRefOrGetter<number | null>) {
  return useAddressMutation(userId, createCustomerAddress)
}

export function useUpdateCustomerAddressMutation(userId: MaybeRefOrGetter<number | null>) {
  return useAddressMutation(userId, (draft) => {
    if (!draft.id) throw new Error('Không tìm thấy địa chỉ cần cập nhật.')
    return updateCustomerAddress(draft.id, draft)
  })
}

export function useSetDefaultCustomerAddressMutation(userId: MaybeRefOrGetter<number | null>) {
  const queryClient = useQueryClient()
  const resolvedUserId = computed(() => toValue(userId))

  return useMutation({
    mutationFn: setDefaultCustomerAddress,
    onMutate: () => resolvedUserId.value,
    onSuccess: async (defaultAddress, _addressId, id) => {
      if (id === null) return
      queryClient.setQueryData<CheckoutAddress[]>(
        customerAddressKeys.list(id),
        (addresses = []) => addresses.map((address) => ({
          ...(address.id === defaultAddress.id ? defaultAddress : address),
          isDefault: address.id === defaultAddress.id,
        })),
      )
      await queryClient.invalidateQueries({ queryKey: customerAddressKeys.list(id) })
    },
  })
}

export function useDeleteCustomerAddressMutation(userId: MaybeRefOrGetter<number | null>) {
  const queryClient = useQueryClient()
  const resolvedUserId = computed(() => toValue(userId))

  return useMutation({
    mutationFn: async (addressId: string) => {
      await deleteCustomerAddress(addressId)
      return addressId
    },
    onMutate: () => resolvedUserId.value,
    onSuccess: async (deletedAddressId, _addressId, id) => {
      if (id === null) return
      queryClient.setQueryData<CheckoutAddress[]>(
        customerAddressKeys.list(id),
        (addresses = []) => addresses.filter((address) => address.id !== deletedAddressId),
      )
      await queryClient.invalidateQueries({ queryKey: customerAddressKeys.list(id) })
    },
  })
}
