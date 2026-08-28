import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCustomerOrder,
  getCustomerOrder,
  getCustomerOrders,
} from "@/api/orderApi";

const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("@/api/clients", () => ({ apiClient: client }));

afterEach(() => {
  client.post.mockReset();
  client.get.mockReset();
});

const detailDto = {
  id: 901,
  order_number: "MZ-901",
  status: "processing" as const,
  status_label: "Đang chuẩn bị hàng",
  delivery_method: "delivery" as const,
  payment_method: "cash" as const,
  payment_status: "paid" as const,
  payment_status_label: "Đã thu tiền",
  payment: {
    id: 77,
    payment_number: "PAY-901",
    method: "cash",
    status: "paid" as const,
    status_label: "Đã thu tiền",
    amount: "480000",
    provider: null,
    transaction_reference: "CASH-901",
    paid_at: "2026-08-26T08:05:00Z",
    failed_at: null,
    cancelled_at: null,
    refunded_at: null,
  },
  branch: { id: 3, name: "Mizuki Ninh Kiều", address: "Cần Thơ" },
  delivery_address: {
    address_id: 17,
    recipient_name: "An",
    recipient_phone: "0901",
    province_code: "CT",
    ghn_district_id: 1444,
    ghn_ward_code: "21010",
    full_address: "123 Đường 3/2",
  },
  shipment: {
    provider: "ghn",
    tracking_code: "GHN901",
    status: "ready_to_pick",
    shipping_fee: "30000",
    expected_delivery_at: "2026-09-02T00:00:00Z",
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
  },
  items: [
    {
      id: 1,
      product_variant_id: 41,
      product_name: "Sữa rửa mặt dịu nhẹ",
      variant_name: "50 ml",
      sku: "INTERNAL-41",
      variant_attributes: { size: "50 ml" },
      unit_price: "150000",
      original_unit_price: "180000",
      final_unit_price: "145000",
      quantity: 2,
      line_total: "290000",
      brand: { id: 12, name: "Eucerin", slug: "eucerin" },
      primary_image_url: "/storage/orders/eucerin.jpg",
      can_review: false,
      review: null,
    },
    {
      id: 2,
      product_variant_id: 42,
      product_name: "Kem dưỡng",
      variant_name: "30 g",
      sku: "INTERNAL-42",
      variant_attributes: null,
      unit_price: 200000,
      quantity: 1,
      line_total: 200000,
      can_review: false,
      review: null,
    },
  ],
  subtotal: "500000",
  discount_amount: "50000",
  shipping_fee: "30000",
  total_amount: "480000",
  cancellation: null,
  refund: null,
  placed_at: "2026-08-26T08:00:00Z",
  cancelled_at: null,
  created_at: "2026-08-26T08:00:00Z",
  updated_at: "2026-08-26T08:30:00Z",
};

describe("customer order API", () => {
  it("posts the exact delivery contract and adapts the authoritative response", async () => {
    const idempotencyKey = "11111111-1111-4111-8111-111111111111";
    const quoteToken = "a".repeat(64);
    const payload = {
      delivery_method: "delivery" as const,
      address_id: 17,
      shipping_quote_token: quoteToken,
      payment_method: "cash" as const,
    };
    client.post.mockResolvedValue({
      data: {
        success: true,
        message: "Đặt hàng thành công!",
        data: {
          id: 901,
          order_number: "MZ-20260825-0901",
          status: "pending",
          status_label: "Chờ xác nhận",
          delivery_method: "delivery",
          payment_method: "cash",
          payment_status: "pending",
          payment_status_label: "Chờ thanh toán",
          total_amount: "519000",
        },
      },
    });

    await expect(createCustomerOrder(payload, idempotencyKey)).resolves.toEqual(
      {
        id: 901,
        orderNumber: "MZ-20260825-0901",
        status: "pending",
        statusLabel: "Chờ xác nhận",
        deliveryMethod: "delivery",
        paymentMethod: "cash",
        paymentStatus: "pending",
        paymentStatusLabel: "Chờ thanh toán",
        totalAmount: 519_000,
      },
    );
    expect(client.post).toHaveBeenCalledTimes(1);
    expect(client.post).toHaveBeenCalledWith("/customer/orders", payload, {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    });
    expect(Object.keys(client.post.mock.calls[0]![1])).toEqual([
      "delivery_method",
      "address_id",
      "shipping_quote_token",
      "payment_method",
    ]);
  });

  it("rejects an invalid authoritative total instead of inventing one", async () => {
    client.post.mockResolvedValue({
      data: {
        success: true,
        message: "Đặt hàng thành công!",
        data: {
          id: 901,
          order_number: "MZ-20260825-0901",
          status: "pending",
          status_label: "Chờ xác nhận",
          delivery_method: "delivery",
          payment_method: "cash",
          total_amount: "invalid",
        },
      },
    });

    await expect(
      createCustomerOrder(
        {
          delivery_method: "delivery",
          address_id: 17,
          shipping_quote_token: "a".repeat(64),
          payment_method: "cash",
        },
        "11111111-1111-4111-8111-111111111111",
      ),
    ).rejects.toThrow("không có tổng tiền hợp lệ");
  });

  it("maps customer order detail without leaking SKU or variant presentation fields", async () => {
    client.get.mockResolvedValue({
      data: { success: true, message: "ok", data: detailDto },
    });

    const order = await getCustomerOrder(901);

    expect(client.get).toHaveBeenCalledWith("/customer/orders/901");
    expect(order).toMatchObject({
      id: 901,
      status: "processing",
      subtotal: 500000,
      discountAmount: 50000,
      shippingFee: 30000,
      totalAmount: 480000,
      paymentStatus: "paid",
      paymentStatusLabel: "Đã thu tiền",
      payment: {
        paymentNumber: "PAY-901",
        status: "paid",
        amount: 480000,
        transactionReference: "CASH-901",
        paidAt: "2026-08-26T08:05:00Z",
      },
      shipment: {
        trackingCode: "GHN901",
        expectedDeliveryAt: "2026-09-02T00:00:00Z",
      },
      items: [
        {
          productVariantId: 41,
          productName: "Sữa rửa mặt dịu nhẹ",
          quantity: 2,
          unitPrice: 150000,
          originalPrice: 180000,
          finalUnitPrice: 145000,
          lineTotal: 290000,
          brandId: 12,
          brandName: "Eucerin",
          brandSlug: "eucerin",
        },
        {
          productVariantId: 42,
          productName: "Kem dưỡng",
          quantity: 1,
          unitPrice: 200000,
          lineTotal: 200000,
        },
      ],
    });
    expect(order.items[0]).not.toHaveProperty("sku");
    expect(order.items[0]).not.toHaveProperty("variantName");
    expect(order.items[0]?.imageUrl).toContain("/storage/orders/eucerin.jpg");
  });

  it("maps the actual COD order response shape without inventing missing catalog enrichment", async () => {
    client.get.mockResolvedValue({
      data: {
        success: true,
        message: "ok",
        data: {
          ...detailDto,
          id: 23,
          order_number: "MZ-20260827201233-EKOX43LJ",
          status: "pending",
          status_label: "Chờ xác nhận",
          payment_status: "pending",
          payment_status_label: "Chờ thanh toán",
          payment: {
            id: 17,
            payment_number: "PAY-20260827201233-FLMQWGQD",
            method: "cash",
            status: "pending",
            status_label: "Chờ thanh toán",
            amount: 125900,
            provider: null,
            transaction_reference: null,
            paid_at: null,
            failed_at: null,
            cancelled_at: null,
            refunded_at: null,
          },
          items: [
            {
              id: 30,
              product_variant_id: 2419,
              product_name:
                "Thực Phẩm Bảo Vệ Sức Khỏe DHC Multi Vitamins (New)",
              variant_name: "Gói 30 ngày",
              sku: "HS-83765",
              variant_attributes: {
                size: "Gói 30 ngày",
                spec_thuong_hieu: "DHC",
              },
              unit_price: 105000,
              quantity: 1,
              line_total: 105000,
              can_review: false,
              review: null,
            },
          ],
          subtotal: 105000,
          discount_amount: 0,
          shipping_fee: 20900,
          total_amount: 125900,
          applied_promotion: null,
          shipment: null,
        },
      },
    });

    const order = await getCustomerOrder(23);

    expect(order).toMatchObject({
      id: 23,
      paymentStatus: "pending",
      paymentStatusLabel: "Chờ thanh toán",
      subtotal: 105000,
      shippingFee: 20900,
      totalAmount: 125900,
      voucherDiscountAmount: null,
      shippingDiscountAmount: null,
      items: [
        {
          quantity: 1,
          unitPrice: 105000,
          finalUnitPrice: 105000,
          lineTotal: 105000,
          brandId: null,
          brandName: null,
          imageUrl: null,
          originalPrice: null,
        },
      ],
    });
  });

  it("uses backend pagination and hydrates each list order from its authoritative detail", async () => {
    client.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          message: "ok",
          data: [{ id: 901 }],
          meta: {
            pagination: {
              current_page: 2,
              per_page: 10,
              total: 21,
              last_page: 3,
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { success: true, message: "ok", data: detailDto },
      });

    await expect(getCustomerOrders(2)).resolves.toMatchObject({
      currentPage: 2,
      lastPage: 3,
      total: 21,
      orders: [{ id: 901 }],
    });
    expect(client.get).toHaveBeenNthCalledWith(1, "/customer/orders", {
      params: { page: 2, per_page: 10 },
    });
    expect(client.get).toHaveBeenNthCalledWith(2, "/customer/orders/901");
  });
});
