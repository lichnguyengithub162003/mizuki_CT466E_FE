import { productListingProducts } from '@/data/products/productListingDemoData'
import type {
  CheckoutAddress,
  CheckoutAddressDraft,
  CheckoutBranch,
  CheckoutPaymentMethod,
  CheckoutProduct,
  CheckoutScenario,
  CheckoutScenarioData,
  CheckoutShippingOption,
  CheckoutVoucher,
} from '@/types/customer'

export const emptyCheckoutAddressDraft: CheckoutAddressDraft = {
  fullName: '',
  phone: '',
  ghn_province_id: null,
  ghn_district_id: null,
  ghn_ward_code: '',
  provinceName: '',
  districtName: '',
  wardName: '',
  detail: '',
  type: 'home',
  isDefault: true,
}

export const checkoutSavedAddresses: readonly CheckoutAddress[] = [
  {
    id: 'address-home',
    fullName: 'Nguyễn Minh Anh',
    phone: '0912345678',
    ghn_province_id: 220,
    ghn_district_id: 1572,
    ghn_ward_code: '550113',
    provinceName: 'Cần Thơ',
    districtName: 'Quận Ninh Kiều',
    wardName: 'Phường Xuân Khánh',
    detail: '48 đường 30/4',
    type: 'home',
    isDefault: true,
    phoneVerified: true,
  },
  {
    id: 'address-office',
    fullName: 'Nguyễn Minh Anh',
    phone: '0987654321',
    ghn_province_id: 220,
    ghn_district_id: 1574,
    ghn_ward_code: '550302',
    provinceName: 'Cần Thơ',
    districtName: 'Quận Cái Răng',
    wardName: 'Phường Hưng Phú',
    detail: '12 Nguyễn Văn Linh',
    type: 'office',
    isDefault: false,
    phoneVerified: true,
  },
]

export const checkoutShippingOptions: readonly CheckoutShippingOption[] = [
  {
    id: 'standard',
    label: 'Giao tiêu chuẩn',
    description: 'Phù hợp cho đơn hàng không cần gấp.',
    estimate: 'Dự kiến 2–3 ngày',
    fee: 30_000,
  },
  {
    id: 'express',
    label: 'Giao nhanh',
    description: 'Ưu tiên xử lý và giao trong nội ô.',
    estimate: 'Dự kiến ngày mai',
    fee: 55_000,
  },
]

export const checkoutBranches: readonly CheckoutBranch[] = [
  {
    id: 'ninh-kieu',
    name: 'Mizuki Ninh Kiều',
    address: '48 đường 30/4, Ninh Kiều, Cần Thơ',
    openingHours: '08:00–21:00',
    available: true,
    availabilityLabel: 'Đủ sản phẩm trong đơn',
  },
  {
    id: 'cai-rang',
    name: 'Mizuki Cái Răng',
    address: '12 Nguyễn Văn Linh, Cái Răng, Cần Thơ',
    openingHours: '08:30–20:30',
    available: true,
    availabilityLabel: 'Đủ sản phẩm trong đơn',
  },
  {
    id: 'binh-thuy',
    name: 'Mizuki Bình Thủy',
    address: '86 Cách Mạng Tháng 8, Bình Thủy, Cần Thơ',
    openingHours: '08:00–20:00',
    available: false,
    availabilityLabel: 'Thiếu 1 sản phẩm',
  },
  {
    id: 'o-mon',
    name: 'Mizuki Ô Môn',
    address: '24 đường 26 Tháng 3, Ô Môn, Cần Thơ',
    openingHours: '08:00–20:00',
    available: true,
    availabilityLabel: 'Đủ sản phẩm trong đơn',
  },
]

export const checkoutVouchers: readonly CheckoutVoucher[] = [
  {
    id: 'order-50',
    code: 'MIZUKI50',
    kind: 'order',
    label: 'Giảm 50.000 ₫',
    description: 'Cho đơn hàng từ 300.000 ₫.',
    discountType: 'fixed',
    discountValue: 50_000,
    minimumOrder: 300_000,
    expiryText: 'Hết hạn 31/08/2026',
  },
  {
    id: 'order-10',
    code: 'BEAUTY10',
    kind: 'order',
    label: 'Giảm 10% tối đa 80.000 ₫',
    description: 'Cho đơn hàng từ 500.000 ₫.',
    discountType: 'percentage',
    discountValue: 10,
    maximumDiscount: 80_000,
    minimumOrder: 500_000,
    expiryText: 'Hết hạn 15/08/2026',
  },
  {
    id: 'shipping-free',
    code: 'FREESHIP',
    kind: 'shipping',
    label: 'Miễn phí vận chuyển',
    description: 'Giảm toàn bộ phí giao tiêu chuẩn.',
    discountType: 'percentage',
    discountValue: 100,
    minimumOrder: 400_000,
    expiryText: 'Hết hạn 20/08/2026',
  },
  {
    id: 'shipping-20',
    code: 'SHIP20',
    kind: 'shipping',
    label: 'Giảm 20.000 ₫ phí vận chuyển',
    description: 'Cho đơn hàng từ 250.000 ₫.',
    discountType: 'fixed',
    discountValue: 20_000,
    minimumOrder: 250_000,
    expiryText: 'Hết hạn 10/08/2026',
  },
  {
    id: 'order-premium',
    code: 'PREMIUM150',
    kind: 'order',
    label: 'Giảm 150.000 ₫',
    description: 'Chưa đủ điều kiện: đơn tối thiểu 1.500.000 ₫.',
    discountType: 'fixed',
    discountValue: 150_000,
    minimumOrder: 1_500_000,
    expiryText: 'Hết hạn 30/09/2026',
  },
]

export const checkoutPaymentMethods: readonly CheckoutPaymentMethod[] = [
  {
    id: 'cod',
    name: 'Thanh toán khi nhận hàng',
    description: 'Thanh toán khi đơn được giao hoặc tại chi nhánh.',
    available: true,
  },
  {
    id: 'vnpay',
    name: 'VNPay',
    description: 'Lựa chọn demo, chưa chuyển tới cổng thanh toán.',
    available: true,
  },
  {
    id: 'wallet',
    name: 'Ví Mizuki',
    description: 'Số dư demo 150.000 ₫.',
    available: false,
    unavailableReason: 'Số dư không đủ để thanh toán đơn hàng.',
    balance: 150_000,
  },
  {
    id: 'atm',
    name: 'Thẻ ATM / Internet Banking',
    description: 'Chọn phương thức local, không nhập thông tin ngân hàng.',
    available: true,
  },
  {
    id: 'card',
    name: 'Thẻ tín dụng / ghi nợ',
    description: 'Không thu thập dữ liệu thẻ trong bản demo.',
    available: true,
  },
]

const availableCheckoutProducts: readonly CheckoutProduct[] = [
  {
    id: 'checkout-product-1',
    product: productListingProducts[0]!,
    variantLabel: 'Dung tích: 236 ml',
    quantity: 1,
    unitPrice: productListingProducts[0]!.price,
    originalUnitPrice: productListingProducts[0]!.originalPrice,
    available: true,
    availabilityLabel: 'Sẵn sàng giao hoặc nhận tại chi nhánh',
  },
  {
    id: 'checkout-product-2',
    product: productListingProducts[2]!,
    variantLabel: 'Dung tích: 50 ml',
    quantity: 2,
    unitPrice: productListingProducts[2]!.price,
    originalUnitPrice: productListingProducts[2]!.originalPrice,
    available: true,
    availabilityLabel: 'Sẵn sàng giao hoặc nhận tại chi nhánh',
  },
]

const unavailableCheckoutProduct: CheckoutProduct = {
  id: 'checkout-product-unavailable',
  product: productListingProducts[5]!,
  variantLabel: 'Phiên bản: Mỏng nhẹ',
  quantity: 1,
  unitPrice: productListingProducts[5]!.price,
  originalUnitPrice: productListingProducts[5]!.originalPrice,
  available: false,
  availabilityLabel: 'Biến thể đã chọn tạm hết hàng',
}

export function createCheckoutScenario(scenario: CheckoutScenario): CheckoutScenarioData {
  return {
    viewState: scenario === 'loading'
      ? 'loading'
      : scenario === 'empty'
        ? 'empty'
        : scenario === 'error'
          ? 'error'
          : 'success',
    addresses: scenario === 'first-time' ? [] : checkoutSavedAddresses,
    products: scenario === 'empty'
      ? []
      : scenario === 'unavailable'
        ? [...availableCheckoutProducts, unavailableCheckoutProduct]
        : availableCheckoutProducts,
    result: scenario === 'failure' ? 'failure' : 'success',
  }
}
