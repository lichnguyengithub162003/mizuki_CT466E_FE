import { ref } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerOrdersPage from "@/pages/customer/CustomerOrdersPage.vue";
import CustomerOrderDetailPage from "@/pages/customer/CustomerOrderDetailPage.vue";
import { CUSTOMER_ORDER_PREVIEW_FIXTURES } from "@/data/customerOrderPreview";
import {
  CUSTOMER_ORDER_STATUS_TAB,
  customerOrderPreviewEnabled,
  orderBelongsToTab,
  resolveCustomerOrderPresentationState,
  type CustomerOrder,
  type CustomerOrderStatus,
  type CustomerOrderTab,
} from "@/types/orders";

const queryMocks = vi.hoisted(() => ({
  useOrders: vi.fn(),
  useOrder: vi.fn(),
  useCart: vi.fn(),
  useAdd: vi.fn(),
  useProducts: vi.fn(),
  useFavorites: vi.fn(),
  useAddFavorite: vi.fn(),
  useRemoveFavorite: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@/queries/orders", () => ({
  useCustomerOrdersInfiniteQuery: queryMocks.useOrders,
  useCustomerOrderQuery: queryMocks.useOrder,
}));
vi.mock("@/queries/cart", () => ({
  useCustomerCartQuery: queryMocks.useCart,
  useAddCartItemMutation: queryMocks.useAdd,
}));
vi.mock("@/queries/productListing", () => ({
  useProductRecommendationsInfiniteQuery: queryMocks.useProducts,
}));
vi.mock("@/queries/favorites", () => ({
  useCustomerFavoritesQuery: queryMocks.useFavorites,
  useAddFavoriteMutation: queryMocks.useAddFavorite,
  useRemoveFavoriteMutation: queryMocks.useRemoveFavorite,
}));
vi.mock("@/components/common/toast", () => ({
  useToast: () => ({ toast: queryMocks.toast }),
}));
vi.mock("@/layouts/CustomerLayout.vue", () => ({
  default: { template: "<main><slot /></main>" },
}));
vi.mock("@/components/products/ProductSuggestions.vue", () => ({
  default: {
    props: ["products", "state", "layout", "favoriteIds", "favoritePending"],
    emits: ["retry", "toggle-favorite"],
    template:
      '<section data-suggestions :data-layout="layout">{{ state }}:{{ products.length }}<button v-if="products[0]" data-test-favorite @click="$emit(\'toggle-favorite\', products[0])">favorite</button></section>',
  },
}));

class ObserverMock {
  static callbacks: IntersectionObserverCallback[] = [];
  constructor(callback: IntersectionObserverCallback) {
    ObserverMock.callbacks.push(callback);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [0];
}

function makeOrder(
  status: CustomerOrderStatus,
  id: number,
  overrides: Partial<CustomerOrder> = {},
): CustomerOrder {
  return {
    id,
    orderNumber: `MZ-${id}`,
    status,
    statusLabel: status,
    deliveryMethod: "delivery",
    paymentMethod: "cash",
    paymentStatus: "pending",
    paymentStatusLabel: "Chờ thanh toán",
    payment: null,
    branch: { id: 8, name: "Mizuki Ninh Kiều", address: "12 Cần Thơ" },
    deliveryAddress: {
      address_id: 2,
      recipient_name: "An",
      recipient_phone: "0901",
      province_code: "CT",
      ghn_district_id: 1,
      ghn_ward_code: "2",
      full_address: "123 Đường 3/2",
    },
    shipment: {
      provider: "ghn",
      trackingCode: "GHN-1",
      status: "in_transit",
      shippingFee: 30000,
      expectedDeliveryAt: "2026-09-02T00:00:00Z",
      shippedAt: "2026-08-28T00:00:00Z",
      deliveredAt: status === "delivered" ? "2026-09-01T00:00:00Z" : null,
      cancelledAt: null,
    },
    items: [
      {
        id: id * 10,
        productVariantId: 51,
        productName: "Sữa rửa mặt dịu nhẹ",
        brandId: 5,
        brandName: "Brand A",
        imageUrl: null,
        quantity: 2,
        unitPrice: 150000,
        lineTotal: 300000,
        canReview: status === "delivered",
        review: null,
      },
      {
        id: id * 10 + 1,
        productVariantId: 52,
        productName:
          "Kem dưỡng phục hồi rất dài nhưng vẫn phải xuống dòng an toàn",
        brandId: 5,
        brandName: "Brand A",
        imageUrl: null,
        quantity: 1,
        unitPrice: 200000,
        lineTotal: 200000,
        canReview: false,
        review: null,
      },
    ],
    subtotal: 500000,
    discountAmount: 50000,
    productDiscountAmount: null,
    voucherDiscountAmount: 50000,
    shippingFee: 30000,
    shippingDiscountAmount: null,
    totalAmount: 480000,
    promotionCode: "MIZUKI50",
    cancellation: null,
    refund: null,
    placedAt: "2026-08-26T00:00:00Z",
    cancelledAt: null,
    createdAt: "2026-08-26T00:00:00Z",
    updatedAt: "2026-08-28T00:00:00Z",
    cancellationRequestedBy: null,
    pickupCustomerName: null,
    pickupCustomerPhone: null,
    pickupCustomerAddress: null,
    ...overrides,
  };
}

const orders = [
  makeOrder("pending", 1),
  makeOrder("processing", 2),
  makeOrder("confirmed", 3),
  makeOrder("delivered", 4),
];
let configuredOrdersQuery: ReturnType<typeof configureQueries>["ordersQuery"];
let configuredProductsQuery: ReturnType<
  typeof configureQueries
>["productsQuery"];

function configureQueries(
  options: {
    hasNext?: boolean;
    isPending?: boolean;
    isError?: boolean;
    isFetchNextPageError?: boolean;
    order?: CustomerOrder;
    add?: () => Promise<unknown>;
    recommendationHasNext?: boolean;
    fetchNextPage?: () => Promise<unknown>;
  } = {},
) {
  const ordersData = ref({
    pages: [
      {
        orders,
        currentPage: 1,
        lastPage: options.hasNext ? 2 : 1,
        total: orders.length,
      },
    ],
  });
  const ordersQuery = {
    data: ordersData,
    isPending: ref(options.isPending ?? false),
    isError: ref(options.isError ?? false),
    isFetchingNextPage: ref(false),
    isFetchNextPageError: ref(options.isFetchNextPageError ?? false),
    hasNextPage: ref(options.hasNext ?? false),
    fetchNextPage: vi.fn(
      options.fetchNextPage ?? (() => Promise.resolve(undefined)),
    ),
    refetch: vi.fn(),
  };
  const productsQuery = {
    data: ref({
      pages: [
        {
          products: [{ id: "101", name: "Gợi ý thật" }],
          pagination: {
            currentPage: 1,
            lastPage: options.recommendationHasNext ? 3 : 1,
          },
        },
      ],
    }),
    isPending: ref(false),
    isError: ref(false),
    isFetchingNextPage: ref(false),
    hasNextPage: ref(options.recommendationHasNext ?? false),
    fetchNextPage: vi.fn().mockResolvedValue(undefined),
    refetch: vi.fn(),
  };
  queryMocks.useOrders.mockReturnValue(ordersQuery);
  queryMocks.useOrder.mockReturnValue({
    data: ref(options.order ?? orders[3]),
    isPending: ref(options.isPending ?? false),
    isError: ref(options.isError ?? false),
    refetch: vi.fn(),
  });
  queryMocks.useCart.mockReturnValue({
    data: ref({ branch: { id: 8 } }),
    refetch: vi.fn().mockResolvedValue(undefined),
  });
  queryMocks.useAdd.mockReturnValue({
    mutateAsync: vi.fn(options.add ?? (() => Promise.resolve({}))),
  });
  queryMocks.useProducts.mockReturnValue(productsQuery);
  queryMocks.useFavorites.mockReturnValue({ data: ref([]) });
  queryMocks.useAddFavorite.mockReturnValue({
    isPending: ref(false),
    mutateAsync: vi.fn().mockResolvedValue({}),
  });
  queryMocks.useRemoveFavorite.mockReturnValue({
    isPending: ref(false),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  });
  configuredOrdersQuery = ordersQuery;
  configuredProductsQuery = productsQuery;
  return { ordersQuery, productsQuery };
}

async function mountPage(
  component: typeof CustomerOrdersPage | typeof CustomerOrderDetailPage,
  path: string,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/orders",
        name: "customer-orders",
        component: CustomerOrdersPage,
      },
      {
        path: "/orders/preview/:fixtureId",
        name: "customer-order-preview-detail",
        component: CustomerOrderDetailPage,
      },
      {
        path: "/orders/:id",
        name: "customer-order-detail",
        component: CustomerOrderDetailPage,
      },
      {
        path: "/products",
        name: "products",
        component: { template: "<h1>Products</h1>" },
      },
      {
        path: "/customer-shell",
        name: "customer-shell",
        component: { template: "<h1>Support</h1>" },
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(component, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

beforeEach(() => {
  vi.clearAllMocks();
  ObserverMock.callbacks = [];
  configureQueries();
  vi.stubGlobal("IntersectionObserver", ObserverMock);
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  vi.stubGlobal("scrollTo", vi.fn());
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe("customer order history", () => {
  it("keeps processing in waiting confirmation and exposes no processing tab", () => {
    expect(CUSTOMER_ORDER_STATUS_TAB.processing).toBe("awaiting-confirmation");
    expect(CUSTOMER_ORDER_STATUS_TAB.confirmed).toBe("awaiting-pickup");
  });

  it("assigns each order to one semantic tab and gives refund state priority over completed", () => {
    const refundedDelivered = makeOrder("delivered", 77, {
      refund: {
        id: 7,
        refundNumber: "RF-77",
        status: "refunded",
        statusLabel: "Đã hoàn tiền",
        requestedAmount: 480000,
        approvedAmount: 450000,
        reviewNote: null,
        reviewedAt: "2026-09-01T00:00:00Z",
        refundedAt: "2026-09-02T00:00:00Z",
      },
    });
    expect(orderBelongsToTab(refundedDelivered, "refund")).toBe(true);
    expect(orderBelongsToTab(refundedDelivered, "completed")).toBe(false);
    const matchingTabs = (
      [
        "awaiting-confirmation",
        "awaiting-pickup",
        "shipping",
        "completed",
        "refund",
        "cancelled",
      ] as CustomerOrderTab[]
    ).filter((tab) => orderBelongsToTab(refundedDelivered, tab));
    expect(matchingTabs).toEqual(["refund"]);
  });

  it("uses only real API orders on /orders and never exposes fixtures or the order number in card headers", async () => {
    const { wrapper } = await mountPage(CustomerOrdersPage, "/orders");
    expect(wrapper.find("[data-preview-orders-section]").exists()).toBe(false);
    expect(wrapper.find("[data-preview-order]").exists()).toBe(false);
    expect(wrapper.get('[data-order-id="1"]').text()).not.toContain("MZ-1");
    expect(wrapper.text()).not.toContain("MZ-PREVIEW");
    expect(wrapper.get("[data-order-list]").classes()).not.toContain(
      "lg:grid-cols-2",
    );
    expect(wrapper.findAll("[data-order-row]")).toHaveLength(4);
  });

  it("keeps real empty and error states instead of falling back to fixtures", async () => {
    configureQueries();
    configuredOrdersQuery.data.value = {
      pages: [{ orders: [], currentPage: 1, lastPage: 1, total: 0 }],
    };
    let mounted = await mountPage(CustomerOrdersPage, "/orders");
    expect(mounted.wrapper.find("[data-orders-empty]").exists()).toBe(true);
    expect(mounted.wrapper.find("[data-preview-order]").exists()).toBe(false);
    configureQueries({ isError: true });
    configuredOrdersQuery.data.value = { pages: [] };
    mounted = await mountPage(CustomerOrdersPage, "/orders");
    expect(
      mounted.wrapper.get('[data-real-orders-section] [role="alert"]').text(),
    ).toContain("Chưa thể tải");
    expect(mounted.wrapper.find("[data-preview-order]").exists()).toBe(false);
  });

  it("renders real and DEV preview data in separate labeled sections without hiding real skeletons", async () => {
    configureQueries({ isPending: true });
    const { wrapper } = await mountPage(
      CustomerOrdersPage,
      "/orders?preview=1",
    );
    expect(wrapper.get("[data-real-orders-section]").text()).not.toContain(
      "Đơn hàng của bạn",
    );
    expect(wrapper.findAll('[data-order-skeleton="card"]')).toHaveLength(4);
    expect(wrapper.get("[data-preview-orders-section]").text()).toContain(
      "Mẫu giao diện",
    );
    expect(wrapper.findAll("[data-preview-order]")).toHaveLength(
      CUSTOMER_ORDER_PREVIEW_FIXTURES.length,
    );
    expect(wrapper.findAll("[data-preview-badge]")).toHaveLength(
      CUSTOMER_ORDER_PREVIEW_FIXTURES.length,
    );
  });

  it("keeps real recommendations reviewable in DEV preview when the authenticated account is empty", async () => {
    configureQueries({ recommendationHasNext: true });
    configuredOrdersQuery.data.value = {
      pages: [{ orders: [], currentPage: 1, lastPage: 1, total: 0 }],
    };
    const { wrapper } = await mountPage(
      CustomerOrdersPage,
      "/orders?preview=1",
    );

    expect(wrapper.find("[data-orders-empty]").exists()).toBe(true);
    expect(wrapper.find("[data-order-recommendations]").exists()).toBe(true);
    expect(wrapper.get("[data-suggestions]").attributes("data-layout")).toBe(
      "six-column-grid",
    );
    expect(wrapper.get("[data-recommendation-sentinel] button").text()).toBe(
      "Xem thêm gợi ý",
    );
  });

  it("gates preview mode by DEV and provides multiple fixtures for every tab", () => {
    expect(customerOrderPreviewEnabled(false, "1")).toBe(false);
    expect(customerOrderPreviewEnabled(true, "1")).toBe(true);
    const tabs: CustomerOrderTab[] = [
      "awaiting-confirmation",
      "awaiting-pickup",
      "shipping",
      "completed",
      "refund",
      "cancelled",
    ];
    for (const tab of tabs)
      expect(
        CUSTOMER_ORDER_PREVIEW_FIXTURES.filter((order) =>
          orderBelongsToTab(order, tab),
        ).length,
      ).toBeGreaterThanOrEqual(2);
    const pendingGroup = CUSTOMER_ORDER_PREVIEW_FIXTURES.filter((order) =>
      orderBelongsToTab(order, "awaiting-confirmation"),
    );
    expect(pendingGroup.map((order) => order.status)).toEqual(
      expect.arrayContaining(["pending", "processing"]),
    );
  });

  it("uses distinct accessible status styles while keeping text labels visible", async () => {
    const { wrapper } = await mountPage(
      CustomerOrdersPage,
      "/orders?preview=1",
    );
    const expected = {
      pending: "amber",
      processing: "blue",
      confirmed: "violet",
      shipping: "cyan",
      delivered: "primary",
      "refund-processing": "sky",
      "refund-success": "teal",
      "refund-rejected": "rose",
      cancelled: "red",
    };
    for (const [status, tone] of Object.entries(expected)) {
      const badge = wrapper.get(
        `[data-preview-order] [data-status-tone="${status}"]`,
      );
      expect(badge.classes().join(" ")).toContain(tone);
      expect(badge.text().length).toBeGreaterThan(0);
    }
  });

  it("renders pending order and paid payment as independent states using the backend payment label", async () => {
    const paidPending = makeOrder("pending", 44, {
      paymentMethod: "vnpay",
      paymentStatus: "paid",
      paymentStatusLabel: "Đã thu tiền qua VNPay",
    });
    configuredOrdersQuery.data.value = {
      pages: [{ orders: [paidPending], currentPage: 1, lastPage: 1, total: 1 }],
    };
    const { wrapper } = await mountPage(CustomerOrdersPage, "/orders");
    const card = wrapper.get('[data-order-id="44"]');
    expect(card.get("[data-order-status]").text()).toContain("Chờ xác nhận");
    expect(card.get("[data-payment-status]").text()).toBe(
      "Đã thu tiền qua VNPay",
    );
    expect(
      card.get("[data-payment-status]").attributes("data-payment-status-tone"),
    ).toBe("paid");
    expect(card.text()).not.toMatch(
      /Thanh toán lại|Tiếp tục thanh toán|Thanh toán ngay/,
    );
  });

  it("maps payment badges from payment status rather than order status", async () => {
    const cases = [
      makeOrder("pending", 45, {
        paymentStatus: "failed",
        paymentStatusLabel: null,
      }),
      makeOrder("pending", 46, {
        paymentStatus: "refunded",
        paymentStatusLabel: null,
      }),
    ];
    configuredOrdersQuery.data.value = {
      pages: [{ orders: cases, currentPage: 1, lastPage: 1, total: 2 }],
    };
    const { wrapper } = await mountPage(CustomerOrdersPage, "/orders");
    expect(
      wrapper.get('[data-order-id="45"] [data-payment-status]').text(),
    ).toBe("Thanh toán thất bại");
    expect(
      wrapper.get('[data-order-id="46"] [data-payment-status]').text(),
    ).toBe("Đã hoàn tiền");
    expect(wrapper.text()).not.toMatch(
      /Thanh toán lại|Tiếp tục thanh toán|Thanh toán ngay/,
    );
  });

  it("does not waste summary space on a redundant status heading", async () => {
    const { wrapper } = await mountPage(
      CustomerOrdersPage,
      "/orders?preview=1",
    );
    expect(
      wrapper.get("[data-preview-order] [data-order-summary-area]").text(),
    ).not.toContain("TRẠNG THÁI");
  });

  it("groups same-brand products once, separates other brands, and keeps missing brand neutral", async () => {
    const { wrapper } = await mountPage(
      CustomerOrdersPage,
      "/orders?preview=1",
    );
    const card = wrapper.get('[data-preview-order][data-order-id="-1"]');
    expect(card.findAll("[data-order-product-name]")).toHaveLength(1);
    await card.get("[data-product-expand]").trigger("click");
    expect(card.findAll('[data-brand-name="Eucerin"]')).toHaveLength(1);
    expect(
      card
        .get('[data-brand-name="Eucerin"]')
        .findAll("[data-order-product-name]"),
    ).toHaveLength(2);
    expect(card.findAll('[data-brand-name="Cocoon"]')).toHaveLength(1);
    expect(
      card.get('[data-brand-name="Eucerin"] header span.truncate').classes(),
    ).toContain("uppercase");
    expect(
      card
        .get('[data-brand-name="Eucerin"] [data-brand-verified-icon]')
        .classes(),
    ).not.toContain("rounded-full");
    expect(card.find('a[aria-label^="Xem sản phẩm Brand"]').exists()).toBe(
      false,
    );
    const neutral = wrapper.get(
      '[data-preview-order][data-order-id="-2"] [data-brand-name="neutral"]',
    );
    expect(neutral.text()).toContain("Sản phẩm khác");
    expect(neutral.find("[data-brand-verified-icon]").exists()).toBe(false);
  });

  it("renders only authoritative original and final prices on the same row and keeps real brand filter links", async () => {
    let mounted = await mountPage(CustomerOrdersPage, "/orders?preview=1");
    expect(mounted.wrapper.find("[data-order-original-price]").exists()).toBe(
      true,
    );
    expect(
      mounted.wrapper.find("[data-order-promotional-price]").exists(),
    ).toBe(false);
    expect(mounted.wrapper.find("[data-order-final-price]").exists()).toBe(
      true,
    );
    const priceRow = mounted.wrapper.get(
      '[data-preview-order][data-order-id="-1"] [data-order-price-row]',
    );
    const originalInPriceRow = priceRow.get("[data-order-original-price]");
    expect(originalInPriceRow.classes()).toContain("line-through");
    expect(priceRow.find("[data-order-final-price]").exists()).toBe(true);
    expect(
      priceRow.get("[data-order-final-price]").classes().join(" "),
    ).toContain("text-[#d63f38]");
    mounted = await mountPage(CustomerOrdersPage, "/orders");
    const href = mounted.wrapper
      .get('[data-order-id="1"] a[aria-label="Xem sản phẩm Brand A"]')
      .attributes("href");
    expect(href).toContain("/products?brand_id=5");
  });

  it("labels a multi-quantity line total and uses the shared product component for real and preview orders", async () => {
    let mounted = await mountPage(CustomerOrdersPage, "/orders?preview=1");
    const previewLine = mounted.wrapper.get(
      '[data-preview-order][data-order-id="-1"] [data-order-line-total]',
    );
    expect(previewLine.text()).toContain("Thành tiền (2 sản phẩm)");
    expect(previewLine.text()).toContain("390.000");
    expect(
      mounted.wrapper
        .find("[data-preview-order] [data-order-product-groups]")
        .exists(),
    ).toBe(true);
    mounted = await mountPage(CustomerOrdersPage, "/orders");
    expect(
      mounted.wrapper
        .find('[data-order-id="1"] [data-order-product-groups]')
        .exists(),
    ).toBe(true);
    expect(
      mounted.wrapper.get('[data-order-id="1"] [data-order-line-total]').text(),
    ).toContain("Thành tiền (2 sản phẩm)");
  });

  it("filters real and preview sections independently and never lets fixtures affect backend pagination", async () => {
    const { wrapper } = await mountPage(
      CustomerOrdersPage,
      "/orders?preview=1",
    );
    const previewCount = wrapper.findAll("[data-preview-order]").length;
    configuredOrdersQuery.data.value.pages.push({
      orders: [makeOrder("shipping", 99)],
      currentPage: 2,
      lastPage: 2,
      total: 5,
    });
    await flushPromises();
    expect(wrapper.findAll("[data-preview-order]")).toHaveLength(previewCount);
    expect(configuredOrdersQuery.data.value.pages).toHaveLength(2);
    const tab = wrapper
      .findAll("nav button")
      .find((button) => button.text() === "Chờ xác nhận")!;
    await tab.trigger("click");
    expect(wrapper.findAll("[data-order-list] [data-order-id]")).toHaveLength(
      2,
    );
    expect(
      wrapper.findAll("[data-preview-order-list] [data-preview-order]"),
    ).toHaveLength(2);
  });

  it("keeps preview cards read-only and routes only to known fixture detail IDs", async () => {
    const { wrapper, router } = await mountPage(
      CustomerOrdersPage,
      "/orders?preview=1",
    );
    expect(
      wrapper
        .findAll("[data-preview-order] button")
        .some((button) => button.text().includes("Theo dõi đơn")),
    ).toBe(true);
    expect(wrapper.find("[data-preview-order]").text()).not.toContain(
      "Mua lại",
    );
    await wrapper
      .findAll("[data-preview-order] button")
      .find((button) => button.text().includes("Theo dõi đơn"))!
      .trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe(
      "customer-order-preview-detail",
    );
    expect(queryMocks.useAdd().mutateAsync).not.toHaveBeenCalled();
  });

  it("loads real pages once and recommendations only one page at a time after explicit activation", async () => {
    configureQueries({ hasNext: true });
    let mounted = await mountPage(CustomerOrdersPage, "/orders");
    const entry = { isIntersecting: true } as IntersectionObserverEntry;
    ObserverMock.callbacks[0]?.([entry], {} as IntersectionObserver);
    await flushPromises();
    expect(configuredOrdersQuery.fetchNextPage).toHaveBeenCalledOnce();

    configureQueries({ recommendationHasNext: true });
    mounted = await mountPage(CustomerOrdersPage, "/orders");
    expect(
      mounted.wrapper.get("[data-suggestions]").attributes("data-layout"),
    ).toBe("six-column-grid");
    expect(configuredProductsQuery.fetchNextPage).not.toHaveBeenCalled();
    await mounted.wrapper
      .get("[data-recommendation-sentinel] button")
      .trigger("click");
    expect(configuredProductsQuery.fetchNextPage).toHaveBeenCalledOnce();
    const recommendationCallback = ObserverMock.callbacks.at(-1)!;
    configuredProductsQuery.isFetchingNextPage.value = true;
    recommendationCallback(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    recommendationCallback([entry], {} as IntersectionObserver);
    expect(configuredProductsQuery.fetchNextPage).toHaveBeenCalledOnce();
    configuredProductsQuery.isFetchingNextPage.value = false;
    recommendationCallback(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    recommendationCallback([entry], {} as IntersectionObserver);
    expect(configuredProductsQuery.fetchNextPage).toHaveBeenCalledTimes(2);
  });

  it("prevents duplicate buy-again clicks and reports partial failures", async () => {
    let calls = 0;
    let release!: () => void;
    const first = new Promise((resolve) => {
      release = () => resolve({});
    });
    configureQueries({
      add: () => {
        calls += 1;
        return calls === 1 ? first : Promise.reject(new Error("stock"));
      },
    });
    const { wrapper } = await mountPage(CustomerOrdersPage, "/orders");
    const button = wrapper
      .findAll('[data-order-id="4"] button')
      .find((candidate) => candidate.text().includes("Mua lại"))!;
    await button.trigger("click");
    await button.trigger("click");
    expect(calls).toBe(1);
    release();
    await flushPromises();
    expect(queryMocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Đã thêm 1/2 sản phẩm"),
        variant: "error",
      }),
    );
    expect(wrapper.text()).not.toContain("Đã thêm 1/2 sản phẩm");
  });

  it("collapses extra products by default and expands them inline with an accessible control", async () => {
    const { wrapper } = await mountPage(CustomerOrdersPage, "/orders");
    const card = wrapper.get('[data-order-id="1"]');
    expect(card.findAll("[data-order-product-name]")).toHaveLength(1);
    const toggle = card.get("[data-product-expand]");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(card.findAll("[data-order-product-name]")).toHaveLength(2);
    await toggle.trigger("click");
    expect(card.findAll("[data-order-product-name]")).toHaveLength(1);
  });

  it("renders shipment emphasis only from supported shipment data and never treats branch as a location", async () => {
    const noShipment = makeOrder("pending", 41, {
      shipment: null,
      branch: { id: 8, name: "Kho không phải vị trí", address: "12 Cần Thơ" },
    });
    configuredOrdersQuery.data.value = {
      pages: [{ orders: [noShipment], currentPage: 1, lastPage: 1, total: 1 }],
    };
    let mounted = await mountPage(CustomerOrdersPage, "/orders");
    expect(mounted.wrapper.find("[data-shipping-highlight]").exists()).toBe(
      false,
    );
    configuredOrdersQuery.data.value = {
      pages: [
        {
          orders: [makeOrder("shipping", 42)],
          currentPage: 1,
          lastPage: 1,
          total: 1,
        },
      ],
    };
    mounted = await mountPage(CustomerOrdersPage, "/orders");
    expect(mounted.wrapper.get("[data-shipping-highlight]").text()).toContain(
      "Ngày giao dự kiến",
    );
    expect(
      mounted.wrapper.get("[data-shipping-highlight]").text(),
    ).not.toContain("Kho không phải vị trí");
  });

  it("never presents a cancelled shipment copy on a processing order card", async () => {
    const processing = makeOrder("processing", 43, {
      shipment: {
        provider: "ghn",
        trackingCode: "GHN-43",
        status: "cancelled",
        shippingFee: 30000,
        expectedDeliveryAt: "2026-09-02T00:00:00Z",
        shippedAt: null,
        deliveredAt: null,
        cancelledAt: "2026-08-29T00:00:00Z",
      },
    });
    configuredOrdersQuery.data.value = {
      pages: [{ orders: [processing], currentPage: 1, lastPage: 1, total: 1 }],
    };
    const { wrapper } = await mountPage(CustomerOrdersPage, "/orders");
    const card = wrapper.get('[data-order-id="43"]');
    expect(card.text()).toContain("Đang xử lý");
    expect(card.get("[data-shipping-highlight]").text()).toContain(
      "Ngày giao dự kiến",
    );
    expect(card.get("[data-shipping-highlight]").text()).not.toContain(
      "Đã hủy",
    );
  });

  it("uses expected dates and tracking actions for pending, confirmed, and shipping states", async () => {
    const { wrapper } = await mountPage(
      CustomerOrdersPage,
      "/orders?preview=1",
    );
    for (const id of [-1, -3, -5]) {
      const card = wrapper.get(`[data-preview-order][data-order-id="${id}"]`);
      expect(card.get("[data-shipping-highlight]").text()).toContain(
        "Ngày giao dự kiến",
      );
      expect(card.text()).toContain("Theo dõi đơn");
    }
    const real = await mountPage(CustomerOrdersPage, "/orders");
    for (const id of [1, 2, 3])
      expect(real.wrapper.get(`[data-order-id="${id}"]`).text()).toContain(
        "Theo dõi đơn",
      );
  });

  it("keeps cancelled history action concise and completed/refund preview fixtures logically populated", async () => {
    const cancelled = makeOrder("cancelled", 81);
    configuredOrdersQuery.data.value = {
      pages: [{ orders: [cancelled], currentPage: 1, lastPage: 1, total: 1 }],
    };
    const real = await mountPage(CustomerOrdersPage, "/orders");
    expect(real.wrapper.get('[data-order-id="81"]').text()).toContain(
      "Xem chi tiết",
    );
    expect(real.wrapper.get('[data-order-id="81"]').text()).not.toContain(
      "Xem chi tiết đơn hủy",
    );
    expect(
      CUSTOMER_ORDER_PREVIEW_FIXTURES.filter(
        (order) => order.status === "delivered",
      ).every((order) => order.items.length > 0),
    ).toBe(true);
    expect(
      CUSTOMER_ORDER_PREVIEW_FIXTURES.filter((order) => order.refund).every(
        (order) => order.items.length > 0,
      ),
    ).toBe(true);
    expect(
      CUSTOMER_ORDER_PREVIEW_FIXTURES.some(
        (order) => order.refund?.status === "rejected",
      ),
    ).toBe(true);
  });

  it("renders representative product images in shared order product rows", async () => {
    const { wrapper } = await mountPage(
      CustomerOrdersPage,
      "/orders?preview=1",
    );
    const image = wrapper.get(
      "[data-preview-order] [data-order-product-image]",
    );
    expect(image.attributes("src")).toContain("images.unsplash.com");
  });

  it("uses infinite scrolling only, prevents duplicate triggers, and stops at the last backend page", async () => {
    let release!: () => void;
    const pendingPage = new Promise<void>((resolve) => {
      release = resolve;
    });
    configureQueries({ hasNext: true, fetchNextPage: () => pendingPage });
    let mounted = await mountPage(CustomerOrdersPage, "/orders");
    expect(mounted.wrapper.text()).not.toContain("Tải thêm");
    expect(mounted.wrapper.text()).not.toMatch(/Trang \d|Previous|Next/);
    const entry = { isIntersecting: true } as IntersectionObserverEntry;
    ObserverMock.callbacks[0]?.([entry], {} as IntersectionObserver);
    ObserverMock.callbacks[0]?.([entry], {} as IntersectionObserver);
    await flushPromises();
    expect(configuredOrdersQuery.fetchNextPage).toHaveBeenCalledOnce();
    release();
    await flushPromises();

    configureQueries({ hasNext: false });
    mounted = await mountPage(CustomerOrdersPage, "/orders");
    ObserverMock.callbacks[0]?.([entry], {} as IntersectionObserver);
    await flushPromises();
    expect(configuredOrdersQuery.fetchNextPage).not.toHaveBeenCalled();
  });

  it("shows only a failed-page retry control after an incremental infinite request fails", async () => {
    configureQueries({
      hasNext: true,
      isError: true,
      isFetchNextPageError: true,
    });
    const { wrapper } = await mountPage(CustomerOrdersPage, "/orders");
    expect(wrapper.find("[data-order-list]").exists()).toBe(true);
    expect(wrapper.get("[data-order-sentinel] button").text()).toContain(
      "Thử tải lại",
    );
    expect(wrapper.text()).not.toContain("Tải thêm");
  });

  it("includes the accessible existing back-to-top behavior", async () => {
    const { wrapper } = await mountPage(CustomerOrdersPage, "/orders");
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 700,
    });
    window.dispatchEvent(new Event("scroll"));
    await flushPromises();
    await wrapper.get("[data-customer-back-to-top]").trigger("click");
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("uses the real favorites mutations for recommendation hearts and prevents duplicate pending requests", async () => {
    const addFavorite = vi.fn().mockResolvedValue({});
    queryMocks.useAddFavorite.mockReturnValue({
      isPending: ref(false),
      mutateAsync: addFavorite,
    });
    const { wrapper } = await mountPage(CustomerOrdersPage, "/orders");
    await wrapper.get("[data-test-favorite]").trigger("click");
    expect(addFavorite).toHaveBeenCalledWith(101);
    expect(queryMocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "success" }),
    );
  });
});

describe("customer order detail", () => {
  it("renders grouped products, address snapshot, shipment, and collapsible authoritative money rows", async () => {
    const { wrapper } = await mountPage(CustomerOrderDetailPage, "/orders/4");
    expect(wrapper.text()).toContain("MZ-4");
    expect(wrapper.text()).toContain("123 Đường 3/2");
    expect(wrapper.text()).toContain("GHN-1");
    expect(wrapper.findAll('[data-brand-name="Brand A"]')).toHaveLength(1);
    const toggle = wrapper.get("[data-money-box] button[aria-expanded]");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(wrapper.find("[data-money-breakdown]").exists()).toBe(false);
    expect(wrapper.get("[data-money-box]").text()).toContain("Thành tiền");
    await toggle.trigger("click");
    expect(wrapper.get("[data-money-breakdown]").text()).toContain(
      "Tổng tiền hàng",
    );
    expect(wrapper.get("[data-money-breakdown]").text()).toContain(
      "Mizuki Voucher",
    );
  });

  it("shows payment method and payment status independently from processing status", async () => {
    const paidPending = makeOrder("pending", 47, {
      paymentMethod: "vnpay",
      paymentStatus: "paid",
      paymentStatusLabel: "Đã thu tiền",
      payment: {
        id: 7,
        paymentNumber: "PAY-47",
        method: "vnpay",
        status: "paid",
        statusLabel: "Đã thu tiền",
        amount: 480000,
        provider: "VNPay",
        transactionReference: "VNP-47",
        paidAt: "2026-08-26T00:05:00Z",
        failedAt: null,
        cancelledAt: null,
        refundedAt: null,
      },
    });
    configureQueries({ order: paidPending });
    const { wrapper } = await mountPage(CustomerOrderDetailPage, "/orders/47");
    expect(
      wrapper.get("[data-active-order-detail] [data-order-status]").text(),
    ).toContain("Chờ xác nhận");
    const payment = wrapper.get("[data-payment-summary]");
    expect(payment.text()).toContain("Phương thức thanh toán");
    expect(payment.text()).toContain("VNPay");
    expect(payment.text()).toContain("Trạng thái thanh toán");
    expect(payment.get("[data-payment-status]").text()).toBe("Đã thu tiền");
    expect(payment.text()).toContain("PAY-47");
    expect(payment.text()).toContain("VNP-47");
    expect(wrapper.text()).not.toMatch(
      /Thanh toán lại|Tiếp tục thanh toán|Thanh toán ngay/,
    );
  });

  it("keeps authoritative zero discount and shipping rows visible in the shared payment box", async () => {
    configureQueries({
      order: makeOrder("pending", 48, {
        shippingFee: 0,
        productDiscountAmount: 0,
        shippingDiscountAmount: 0,
        voucherDiscountAmount: 0,
      }),
    });
    const { wrapper } = await mountPage(CustomerOrderDetailPage, "/orders/48");
    await wrapper
      .get("[data-money-box] button[aria-expanded]")
      .trigger("click");
    const breakdown = wrapper.get("[data-money-breakdown]");
    for (const label of [
      "Tổng tiền hàng",
      "Giảm giá sản phẩm",
      "Phí vận chuyển",
      "Ưu đãi phí vận chuyển",
      "Mizuki Voucher",
    ])
      expect(breakdown.text()).toContain(label);
    expect(breakdown.text().match(/0 ₫/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("resolves equivalent real and preview orders through the same presentation state and detail tree", async () => {
    const preview = CUSTOMER_ORDER_PREVIEW_FIXTURES.find(
      (order) => order.previewId === "pending-multibrand",
    )!;
    const real: CustomerOrder = {
      ...preview,
      id: 23,
      orderNumber: "MZ-REAL-23",
      previewId: undefined,
    };
    expect(resolveCustomerOrderPresentationState(real)).toBe(
      resolveCustomerOrderPresentationState(preview),
    );

    configureQueries({ order: real });
    const realPage = await mountPage(CustomerOrderDetailPage, "/orders/23");
    const previewPage = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/pending-multibrand",
    );
    expect(
      realPage.wrapper
        .get("[data-order-presentation-state]")
        .attributes("data-order-presentation-state"),
    ).toBe("pending");
    expect(
      previewPage.wrapper
        .get("[data-order-presentation-state]")
        .attributes("data-order-presentation-state"),
    ).toBe("pending");

    for (const selector of [
      "[data-active-order-detail]",
      "[data-customer-destination]",
      "[data-order-detail-products]",
      "[data-order-product-groups]",
      "[data-money-box]",
      "[data-payment-summary]",
      "[data-order-recommendations]",
    ]) {
      expect(realPage.wrapper.find(selector).exists(), selector).toBe(true);
      expect(previewPage.wrapper.find(selector).exists(), selector).toBe(true);
    }

    await realPage.wrapper
      .get("[data-money-box] button[aria-expanded]")
      .trigger("click");
    await previewPage.wrapper
      .get("[data-money-box] button[aria-expanded]")
      .trigger("click");
    const labels = (wrapper: typeof realPage.wrapper) =>
      wrapper.findAll("[data-money-breakdown] dt").map((row) => row.text());
    expect(labels(realPage.wrapper)).toEqual(labels(previewPage.wrapper));
    expect(realPage.wrapper.text()).not.toContain("Dữ liệu xem trước");
    expect(previewPage.wrapper.text()).toContain("Dữ liệu xem trước");
  });

  it("renders a real API-normalized product with the exact shared image, brand, price, and line-total presentation", async () => {
    const realProduct = {
      ...makeOrder("pending", 61).items[0]!,
      imageUrl: "https://cdn.example.test/order-product.jpg",
      brandId: 12,
      brandName: "Eucerin",
      originalPrice: 260_000,
      finalUnitPrice: 195_000,
      quantity: 2,
      lineTotal: 390_000,
    };
    configureQueries({
      order: makeOrder("pending", 61, { items: [realProduct] }),
    });
    const { wrapper } = await mountPage(CustomerOrderDetailPage, "/orders/61");
    const product = wrapper.get("[data-order-detail-products]");
    expect(product.get("[data-order-product-image]").attributes("src")).toBe(
      realProduct.imageUrl,
    );
    expect(product.get('[data-brand-name="Eucerin"]')).toBeTruthy();
    expect(
      product.get('a[aria-label="Xem sản phẩm Eucerin"]').attributes("href"),
    ).toContain("brand_id=12");
    const priceRow = product.get("[data-order-price-row]");
    expect(priceRow.get("[data-order-original-price]").text()).toContain(
      "260.000",
    );
    expect(priceRow.get("[data-order-original-price]").classes()).toContain(
      "line-through",
    );
    expect(priceRow.get("[data-order-final-price]").text()).toContain(
      "195.000",
    );
    expect(product.get("[data-order-line-total]").text()).toContain("390.000");
  });

  it("changes every successful copy control to a checkmark for three seconds without text feedback", async () => {
    vi.useFakeTimers();
    const { wrapper } = await mountPage(CustomerOrderDetailPage, "/orders/4");
    const button = wrapper.get('button[aria-label="Sao chép mã đơn hàng"]');
    await button.trigger("click");
    await flushPromises();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("MZ-4");
    expect(wrapper.find("[data-copy-success-icon]").exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Đã sao chép mã đơn hàng");
    await vi.advanceTimersByTimeAsync(2999);
    await flushPromises();
    expect(wrapper.find("[data-copy-success-icon]").exists()).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(wrapper.find("[data-copy-success-icon]").exists()).toBe(false);
    vi.useRealTimers();
  });

  it("uses the same icon-only copy behavior for refund request codes", async () => {
    const { wrapper } = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/refund-processing",
    );
    await wrapper
      .get("[data-refund-detail] button[aria-expanded]")
      .trigger("click");
    const copy = wrapper.get(
      'button[aria-label="Sao chép mã yêu cầu hoàn tiền"]',
    );
    await copy.trigger("click");
    await flushPromises();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "RF-PREVIEW-903",
    );
    expect(
      wrapper.find("[data-refund-detail] [data-copy-success-icon]").exists(),
    ).toBe(true);
    expect(wrapper.text()).not.toContain("Đã sao chép mã yêu cầu hoàn tiền");
  });

  it("consolidates cancellation fields and the customer snapshot in one highlighted card", async () => {
    const cancelled = makeOrder("cancelled", 8, {
      cancellation: {
        reason_type: "changed_mind",
        reason: "Đổi ý",
        cancelled_at: "2026-08-27T00:00:00Z",
      },
      cancelledAt: "2026-08-27T00:00:00Z",
      cancellationRequestedBy: "Khách hàng",
    });
    configureQueries({ order: cancelled });
    const { wrapper } = await mountPage(CustomerOrderDetailPage, "/orders/8");
    const summary = wrapper.get("[data-cancellation-summary]");
    expect(summary.text()).toContain("Đã hủy vào");
    expect(summary.text()).toContain("Đổi ý");
    expect(summary.text()).toContain("Được hủy bởi bạn");
    expect(summary.text()).toContain("123 Đường 3/2");
    expect(wrapper.find("[data-cancellation-detail]").exists()).toBe(false);
  });

  it("keeps refund detail limited to that exact order products and no recommendations", async () => {
    const refunded = makeOrder("refunded", 9, {
      items: [
        {
          ...makeOrder("refunded", 9).items[0]!,
          productName: "Sản phẩm hoàn tiền duy nhất",
        },
      ],
      refund: {
        id: 1,
        refundNumber: "RF-9",
        status: "refunded",
        statusLabel: "Đã hoàn tiền",
        requestedAmount: 480000,
        approvedAmount: 450000,
        reviewNote: "Duyệt một phần",
        reviewedAt: "2026-09-01T00:00:00Z",
        refundedAt: "2026-09-02T00:00:00Z",
      },
    });
    configureQueries({ order: refunded });
    const { wrapper } = await mountPage(CustomerOrderDetailPage, "/orders/9");
    expect(wrapper.get("[data-order-detail-products]").text()).toContain(
      "Sản phẩm hoàn tiền duy nhất",
    );
    expect(wrapper.get("[data-money-box]").text()).toContain("450.000");
    expect(wrapper.find("[data-order-recommendations]").exists()).toBe(true);
    expect(
      wrapper.find("[data-refund-detail] [data-suggested-product]").exists(),
    ).toBe(false);
  });

  it("renders state-specific completed and refund progress experiences without breadcrumb order code", async () => {
    let mounted = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/delivered-review",
    );
    expect(mounted.wrapper.find("[data-completed-order-detail]").exists()).toBe(
      true,
    );
    expect(
      mounted.wrapper.get("[data-order-detail-header]").text(),
    ).not.toContain("MZ-PREVIEW");
    expect(mounted.wrapper.get("[data-order-meta]").text()).toContain(
      "MZ-PREVIEW-DELIVERED-REVIEW",
    );
    mounted = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/refund-processing",
    );
    expect(mounted.wrapper.get("[data-refund-status-card]").text()).toContain(
      "Đang hoàn tiền",
    );
    expect(mounted.wrapper.find("[data-refund-progress]").exists()).toBe(true);
    expect(mounted.wrapper.get("[data-refund-progress]").text()).not.toContain(
      "Chưa cập nhật",
    );
    mounted = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/refund-rejected",
    );
    expect(mounted.wrapper.get("[data-refund-status-card]").text()).toContain(
      "Yêu cầu hoàn tiền bị từ chối",
    );
    expect(mounted.wrapper.get("[data-refund-status-card]").text()).toContain(
      "Sản phẩm không đáp ứng điều kiện",
    );
  });

  it("renders the complete completed-order acceptance structure from authoritative preview fields", async () => {
    const { wrapper } = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/delivered-review",
    );
    expect(wrapper.get("[data-completed-order-detail]").text()).toContain(
      "Đơn hàng đã hoàn thành",
    );
    expect(wrapper.get("[data-completed-order-detail]").text()).toContain(
      "Giao Hàng Nhanh (GHN)",
    );
    expect(wrapper.get("[data-completed-order-detail]").text()).toContain(
      "Giao hàng thành công",
    );
    expect(wrapper.text()).toContain("Địa chỉ nhận hàng");
    expect(wrapper.get("[data-order-detail-products]").text()).not.toContain(
      "Sản phẩm (0)",
    );
    await wrapper
      .get("[data-money-box] button[aria-expanded]")
      .trigger("click");
    const money = wrapper.get("[data-money-breakdown]").text();
    expect(money).toContain("Tổng tiền hàng");
    expect(money).toContain("Phí vận chuyển");
    expect(money).toContain("Ưu đãi phí vận chuyển");
    expect(money).toContain("Mizuki Voucher");
    expect(wrapper.text()).toContain("Gửi yêu cầu trả hàng/hoàn tiền");
    expect(wrapper.get("[data-order-meta]").text()).toContain(
      "MZ-PREVIEW-DELIVERED-REVIEW",
    );
  });

  it("renders complete refund payment and request detail fields, including rejected admin reason", async () => {
    let mounted = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/refund-processing",
    );
    await mounted.wrapper
      .get("[data-money-box] button[aria-expanded]")
      .trigger("click");
    const money = mounted.wrapper.get("[data-refund-money-breakdown]").text();
    for (const label of [
      "Tổng tiền",
      "Hoàn tiền vào",
      "Tổng giá trị sản phẩm",
      "Voucher giảm giá",
      "Số tiền hoàn nhận được",
    ])
      expect(money).toContain(label);
    await mounted.wrapper
      .get("[data-refund-detail] button[aria-expanded]")
      .trigger("click");
    const detail = mounted.wrapper.get("[data-refund-detail]").text();
    expect(detail).toContain("Lý do trả hàng / hoàn tiền");
    expect(detail).toContain("Đã yêu cầu lúc");
    expect(detail).toContain("Thời gian chấp nhận trả hàng / hoàn tiền");
    expect(detail).toContain("Mã yêu cầu trả hàng / hoàn tiền");

    mounted = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/refund-rejected",
    );
    await mounted.wrapper
      .get("[data-refund-detail] button[aria-expanded]")
      .trigger("click");
    expect(mounted.wrapper.get("[data-refund-detail]").text()).toContain(
      "Thời gian từ chối",
    );
    expect(mounted.wrapper.get("[data-refund-detail]").text()).toContain(
      "Lý do từ chối",
    );
    expect(mounted.wrapper.get("[data-refund-detail]").text()).toContain(
      "Sản phẩm không đáp ứng điều kiện",
    );
  });

  it("keeps cancelled detail complete and presents a customer requester naturally", async () => {
    const { wrapper } = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/cancelled-delivery",
    );
    const summary = wrapper.get("[data-cancellation-summary]");
    expect(summary.text()).toContain("Đã hủy đơn hàng");
    expect(summary.text()).toContain("Được hủy bởi bạn");
    expect(summary.text()).toContain("Yêu cầu lúc");
    expect(summary.text()).toContain("Lý do");
    expect(summary.text()).toContain("Phương thức thanh toán");
    expect(summary.get("[data-cancelled-shipment]").text()).toContain(
      "Đơn vị vận chuyển thông báo đơn hàng đã bị hủy",
    );
    expect(wrapper.get("[data-order-detail-products]").text()).not.toContain(
      "Sản phẩm (0)",
    );
    expect(wrapper.find("[data-money-box]").exists()).toBe(true);
    expect(wrapper.find("[data-order-meta]").exists()).toBe(true);
    expect(wrapper.text()).toContain("Bạn cần hỗ trợ?");
    expect(wrapper.find("[data-order-recommendations]").exists()).toBe(true);
  });

  it("keeps pickup customer name, phone, address, and branch visible in shared detail UI", async () => {
    const { wrapper } = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/confirmed-pickup",
    );
    const destination = wrapper.get("[data-customer-destination]");
    expect(destination.text()).toContain("Lê Hà");
    expect(destination.text()).toContain("0933 222 111");
    expect(destination.text()).toContain("20 Trần Văn Khéo");
    expect(destination.text()).toContain("Mizuki Ninh Kiều");
    expect(destination.text()).toContain("12 Nguyễn Việt Hồng");
  });

  it("balances five shipping fields as three plus two on large screens", async () => {
    const { wrapper } = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/shipping-progress",
    );
    const grid = wrapper.get("[data-shipment-information-grid]");
    expect(grid.classes()).toContain("lg:grid-cols-6");
    expect(grid.findAll(":scope > div")).toHaveLength(5);
    expect(grid.findAll(":scope > div")[3]?.classes()).toContain(
      "lg:col-start-2",
    );
    expect(grid.text()).toContain("Giao Hàng Nhanh (GHN)");
    expect(grid.text()).toContain("Đang giao hàng");
  });

  it("resolves only known DEV fixture IDs and never exposes real mutations", async () => {
    let mounted = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/cancelled-delivery",
    );
    expect(mounted.wrapper.text()).toContain("MZ-PREVIEW-CANCELLED-DELIVERY");
    expect(mounted.wrapper.text()).toContain("Mẫu chỉ để xem");
    expect(queryMocks.useAdd().mutateAsync).not.toHaveBeenCalled();
    mounted = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/not-real",
    );
    expect(mounted.wrapper.get('[role="alert"]').text()).toContain(
      "Không tìm thấy mẫu",
    );
  });

  it("uses detailed skeletons only for real detail loading", async () => {
    configureQueries({ isPending: true });
    let mounted = await mountPage(CustomerOrderDetailPage, "/orders/4");
    expect(
      mounted.wrapper.find('[data-order-skeleton="detail"]').exists(),
    ).toBe(true);
    mounted = await mountPage(
      CustomerOrderDetailPage,
      "/orders/preview/shipping-started",
    );
    expect(mounted.wrapper.find("[data-order-skeleton]").exists()).toBe(false);
  });
});
