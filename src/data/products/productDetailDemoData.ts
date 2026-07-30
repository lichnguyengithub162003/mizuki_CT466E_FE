import type {
  ProductDetail,
  ProductDetailBranch,
  ProductDetailImage,
  ProductListingProduct,
} from '@/types/products'
import { productListingProducts } from './productListingDemoData'

const productImages: readonly ProductDetailImage[] = [
  { id: 'front', label: 'Mặt trước', alt: 'Bao bì mặt trước của sản phẩm', tone: 'sage' },
  { id: 'texture', label: 'Kết cấu', alt: 'Kết cấu gel trong nhẹ của sản phẩm', tone: 'mint' },
  { id: 'benefit', label: 'Công dụng', alt: 'Minh hoạ công dụng chính của sản phẩm', tone: 'sand' },
  { id: 'routine', label: 'Chu trình', alt: 'Sản phẩm trong chu trình chăm sóc da', tone: 'rose' },
  { id: 'packaging', label: 'Bao bì', alt: 'Chi tiết bao bì và vòi lấy sản phẩm', tone: 'sky' },
]

const productBranches: readonly ProductDetailBranch[] = [
  {
    id: 'ninh-kieu',
    name: 'Mizuki Ninh Kiều',
    address: '48 đường 30/4, Ninh Kiều, Cần Thơ',
    stockState: 'available',
    stockLabel: 'Còn hàng',
  },
  {
    id: 'cai-rang',
    name: 'Mizuki Cái Răng',
    address: '12 Nguyễn Văn Linh, Cái Răng, Cần Thơ',
    stockState: 'low-stock',
    stockLabel: 'Sắp hết hàng',
  },
  {
    id: 'binh-thuy',
    name: 'Mizuki Bình Thủy',
    address: '86 Cách Mạng Tháng 8, Bình Thủy, Cần Thơ',
    stockState: 'out-of-stock',
    stockLabel: 'Tạm hết hàng',
  },
  {
    id: 'o-mon',
    name: 'Mizuki Ô Môn',
    address: '24 đường 26 Tháng 3, Ô Môn, Cần Thơ',
    stockState: 'available',
    stockLabel: 'Còn hàng',
  },
  {
    id: 'thot-not',
    name: 'Mizuki Thốt Nốt',
    address: '118 Quốc lộ 91, Thốt Nốt, Cần Thơ',
    stockState: 'low-stock',
    stockLabel: 'Sắp hết hàng',
  },
  {
    id: 'phong-dien',
    name: 'Mizuki Phong Điền',
    address: '32 Nhơn Ái, Phong Điền, Cần Thơ',
    stockState: 'available',
    stockLabel: 'Còn hàng',
  },
]

const detailTemplate: Omit<
  ProductDetail,
  | 'id'
  | 'slug'
  | 'name'
  | 'brand'
  | 'currentPrice'
  | 'originalPrice'
  | 'discountLabel'
  | 'rating'
  | 'reviewCount'
  | 'soldCount'
  | 'stockState'
  | 'stockLabel'
> = {
  images: productImages,
  badges: ['Mizuki chọn', 'Chính hãng'],
  sellingPoints: [
    'Làm sạch dịu nhẹ mà không gây khô căng',
    'Hỗ trợ duy trì độ ẩm và hàng rào bảo vệ da',
    'Kết cấu dễ rửa, phù hợp sử dụng hằng ngày',
  ],
  shippingSummary: 'Miễn phí vận chuyển cho đơn từ 299.000 ₫',
  destinationSummary: 'Giao dự kiến 1–2 ngày tại nội ô Cần Thơ',
  maxQuantity: 8,
  variants: [
    {
      id: 'volume',
      label: 'Dung tích',
      options: [
        { id: '150ml', label: '150 ml', available: true },
        { id: '236ml', label: '236 ml', available: true },
        { id: '473ml', label: '473 ml', available: false },
      ],
    },
  ],
  description: [
    'Công thức làm sạch cân bằng giúp loại bỏ bụi bẩn, dầu thừa và cặn chống nắng trong khi vẫn giữ cảm giác mềm mại sau khi rửa.',
    'Độ pH thân thiện với làn da cùng kết cấu gel mịn phù hợp cho chu trình chăm sóc da tối giản mỗi sáng và tối.',
  ],
  ingredients: [
    'Glycerin hỗ trợ duy trì độ ẩm tự nhiên trên bề mặt da.',
    'Panthenol và allantoin góp phần làm dịu cảm giác khó chịu.',
    'Công thức không chứa cồn khô và hương liệu nồng.',
  ],
  usage: [
    'Làm ướt mặt bằng nước sạch.',
    'Lấy một lượng vừa đủ, tạo bọt nhẹ trong lòng bàn tay.',
    'Massage trên da 30–60 giây rồi rửa sạch; dùng sáng và tối.',
  ],
  specifications: [
    { label: 'Loại da phù hợp', value: 'Mọi loại da, kể cả da nhạy cảm' },
    { label: 'Kết cấu', value: 'Gel trong, tạo bọt nhẹ' },
    { label: 'Xuất xứ thương hiệu', value: 'Pháp' },
    { label: 'Hạn sử dụng', value: '36 tháng từ ngày sản xuất' },
  ],
  reviews: [
    {
      id: 'review-1',
      author: 'Minh Anh',
      rating: 5,
      date: '12/07/2026',
      content: 'Gel nhẹ, rửa sạch nhưng da không bị căng. Bao bì chắc chắn.',
      verified: true,
    },
    {
      id: 'review-2',
      author: 'Hà My',
      rating: 4,
      date: '04/07/2026',
      content: 'Phù hợp dùng buổi sáng, mùi rất nhẹ và dễ chịu.',
      verified: true,
    },
  ],
  ratingDistribution: [
    { rating: 5, count: 102, percentage: 79 },
    { rating: 4, count: 21, percentage: 16 },
    { rating: 3, count: 5, percentage: 4 },
    { rating: 2, count: 1, percentage: 1 },
    { rating: 1, count: 0, percentage: 0 },
  ],
  questions: [
    {
      id: 'question-1',
      author: 'Ngọc',
      question: 'Da nhạy cảm có thể dùng sản phẩm hằng ngày không?',
      answer: 'Sản phẩm được thiết kế để dùng hằng ngày. Bạn nên thử trên vùng da nhỏ nếu đang trong liệu trình đặc biệt.',
      date: '18/07/2026',
    },
    {
      id: 'question-2',
      author: 'Thảo',
      question: 'Có thể dùng để làm sạch kem chống nắng không?',
      answer: 'Có thể dùng sau bước tẩy trang để hoàn thiện quy trình làm sạch kép vào cuối ngày.',
      date: '09/07/2026',
    },
  ],
  branches: productBranches,
  relatedProductIds: [
    'listing-2',
    'listing-3',
    'listing-4',
    'listing-5',
    'listing-7',
    'listing-8',
    'listing-10',
    'listing-12',
  ],
}

function toDetailStock(product: ProductListingProduct) {
  if (product.stockState === 'sold_out') {
    return { state: 'out-of-stock' as const, label: 'Tạm hết hàng' }
  }

  if (product.stockState === 'low') {
    return { state: 'low-stock' as const, label: 'Sắp hết hàng' }
  }

  return { state: 'available' as const, label: 'Còn hàng' }
}

/**
 * Resolves typed local detail content from the existing catalog so list and
 * detail routes share the same product identity and commercial fields.
 */
export function getProductDetailBySlug(slug: string): ProductDetail | undefined {
  const catalogProduct = productListingProducts.find((product) => product.slug === slug)

  if (!catalogProduct) {
    return undefined
  }

  const stock = toDetailStock(catalogProduct)

  return {
    ...detailTemplate,
    id: catalogProduct.id,
    slug: catalogProduct.slug,
    name: catalogProduct.name,
    brand: {
      name: catalogProduct.brand,
      initials: catalogProduct.brand
        .split(' ')
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase(),
      origin: 'Pháp',
      description: 'Thương hiệu chăm sóc cá nhân chú trọng công thức dịu nhẹ, minh bạch và trải nghiệm sử dụng hằng ngày.',
      rating: 4.8,
      reviewCount: 2_460,
      productCount: 128,
      isOfficial: true,
    },
    currentPrice: catalogProduct.price,
    originalPrice: catalogProduct.originalPrice,
    discountLabel: catalogProduct.discountPercent ? `-${catalogProduct.discountPercent}%` : undefined,
    rating: catalogProduct.rating ?? 0,
    reviewCount: catalogProduct.reviewCount ?? 0,
    soldCount: catalogProduct.soldCount ?? 0,
    stockState: stock.state,
    stockLabel: stock.label,
  }
}

export function getRelatedProducts(product: ProductDetail): readonly ProductListingProduct[] {
  return productListingProducts.filter((item) => product.relatedProductIds.includes(item.id))
}
