import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { getAdminDetail, getAdminList, getAdminOrderCounts } from '@/api/adminApi'
import type { AdminListParams, AdminModule, AdminRecord } from '@/types/admin'

export const adminKeys = {
  all: ['admin'] as const,
  lists: (module: AdminModule) => ['admin', module, 'list'] as const,
  list: (module: AdminModule, params: AdminListParams) => ['admin', module, 'list', params] as const,
  detail: (module: AdminModule, id: number | string) => ['admin', module, 'detail', id] as const,
  orderCounts: ['admin', 'orders', 'counts'] as const,
}

export function useAdminOrderCounts() {
  return useQuery({
    queryKey: adminKeys.orderCounts,
    queryFn: getAdminOrderCounts,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
}

export function useAdminList<T extends AdminRecord>(module: MaybeRefOrGetter<AdminModule>, params: MaybeRefOrGetter<AdminListParams>) {
  return useQuery({
    queryKey: computed(() => adminKeys.list(toValue(module), toValue(params))),
    queryFn: () => getAdminList<T>(toValue(module), toValue(params)),
    placeholderData: (previous) => previous,
  })
}

export function useAdminOrdersInfinite<T extends AdminRecord>(params: MaybeRefOrGetter<AdminListParams>) {
  return useInfiniteQuery({
    queryKey: computed(() => ['admin', 'orders', 'infinite', toValue(params)]),
    queryFn: ({ pageParam }) => getAdminList<T>('orders', { ...toValue(params), page: pageParam }),
    initialPageParam: 1,
    placeholderData: (previous) => previous,
    getNextPageParam: (lastPage) => lastPage.pagination.current_page < lastPage.pagination.last_page
      ? lastPage.pagination.current_page + 1
      : undefined,
  })
}

export function useAdminDetail<T extends AdminRecord>(module: MaybeRefOrGetter<AdminModule>, id: MaybeRefOrGetter<number | string>) {
  return useQuery({
    queryKey: computed(() => adminKeys.detail(toValue(module), toValue(id))),
    queryFn: () => getAdminDetail<T>(toValue(module), toValue(id)),
    enabled: computed(() => String(toValue(id)).length > 0),
  })
}

export function useAdminMutation<TData, TVariables>(module: MaybeRefOrGetter<AdminModule>, mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', toValue(module)] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ])
    },
  })
}
