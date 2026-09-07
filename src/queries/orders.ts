import { computed, toValue, type MaybeRefOrGetter } from "vue";
import {
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from "@tanstack/vue-query";
import {
  createCustomerOrder,
  getCustomerOrder,
  getCustomerOrders,
  requestCustomerOrderRefund,
  type RequestOrderRefundPayload,
} from "@/api/orderApi";
import type {
  CreateCustomerOrderRequest,
  CustomerOrderTab,
} from "@/types/orders";

const orderQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 15_000 } },
});

export function useCustomerOrdersInfiniteQuery(
  tab: MaybeRefOrGetter<CustomerOrderTab>,
) {
  const normalizedTab = computed(() => toValue(tab));
  return useInfiniteQuery(
    {
      queryKey: computed(() => ["customer-orders", normalizedTab.value]),
      queryFn: ({ pageParam }) => getCustomerOrders(pageParam),
      initialPageParam: 1,
      gcTime: 0,
      getNextPageParam: (lastPage) =>
        lastPage.currentPage < lastPage.lastPage
          ? lastPage.currentPage + 1
          : undefined,
    },
    orderQueryClient,
  );
}

export function useCustomerOrderQuery(
  orderId: MaybeRefOrGetter<number | null>,
) {
  const normalizedOrderId = computed(() => toValue(orderId));
  return useQuery(
    {
      queryKey: computed(() => [
        "customer-order",
        normalizedOrderId.value ?? 0,
      ]),
      queryFn: () => getCustomerOrder(normalizedOrderId.value!),
      enabled: computed(() => normalizedOrderId.value !== null),
    },
    orderQueryClient,
  );
}

export interface CreateCustomerOrderVariables {
  readonly payload: CreateCustomerOrderRequest;
  readonly idempotencyKey: string;
}

export function useCreateCustomerOrderMutation() {
  return useMutation({
    mutationFn: ({ payload, idempotencyKey }: CreateCustomerOrderVariables) =>
      createCustomerOrder(payload, idempotencyKey),
    retry: false,
  });
}

export function useRequestOrderRefundMutation(orderId: MaybeRefOrGetter<number | null>) {
  const normalizedOrderId = computed(() => toValue(orderId));
  return useMutation({
    mutationFn: (payload: RequestOrderRefundPayload) =>
      requestCustomerOrderRefund(normalizedOrderId.value!, payload),
    onSuccess: async () => {
      await orderQueryClient.invalidateQueries({ queryKey: ["customer-order", normalizedOrderId.value] });
      await orderQueryClient.invalidateQueries({ queryKey: ["customer-orders"] });
    },
    retry: false,
  });
}
