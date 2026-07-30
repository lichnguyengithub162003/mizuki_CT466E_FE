import type {
  ProductCategoryBrand,
  ProductCategory,
  ProductCategorySummary,
  ProductFeaturedCategory,
  ProductFilterOption,
  ProductFilterState,
  ProductListingBanner,
  ProductListingProduct,
  ProductSortOption,
} from '@/types/products'

export const productListingBanner: ProductListingBanner = {
  eyebrow: 'Nổi bật trong danh mục',
  title: 'Sản phẩm chăm sóc da được quan tâm',
  description: 'Một lựa chọn minh họa dịu nhẹ đang được yêu thích trong danh mục chăm sóc da.',
  actionLabel: 'Xem sản phẩm nổi bật',
}

export const productCategorySummary: ProductCategorySummary = {
  name: 'chăm sóc da',
  description: 'Lựa chọn sản phẩm theo bước chăm sóc, nhu cầu và mức giá phù hợp với nhịp sống mỗi ngày.',
  resultCount: 20,
  quickFilterIds: [
    'cleanser',
    'serum',
    'moisturizer',
    'sun-care',
    'makeup',
    'hair-care',
  ],
  previewProducts: [
    {
      id: 'category-preview-cleanser',
      name: 'Gel làm sạch dịu nhẹ',
      brand: 'CeraVe',
      tone: 'sky',
      featured: true,
    },
    {
      id: 'category-preview-serum',
      name: 'Serum phục hồi làn da',
      brand: 'La Roche-Posay',
      tone: 'mint',
    },
    {
      id: 'category-preview-moisturizer',
      name: 'Kem dưỡng khóa ẩm',
      brand: 'Eucerin',
      tone: 'rose',
    },
    {
      id: 'category-preview-sun-care',
      name: 'Chống nắng mỏng nhẹ',
      brand: 'Bioderma',
      tone: 'sand',
    },
  ],
}

export const productCategories: readonly ProductCategory[] = [
  { id: 'cleanser', label: 'Làm sạch' },
  { id: 'serum', label: 'Serum' },
  { id: 'moisturizer', label: 'Kem dưỡng' },
  { id: 'sun-care', label: 'Chống nắng' },
  { id: 'makeup', label: 'Trang điểm' },
  { id: 'hair-care', label: 'Chăm sóc tóc' },
  { id: 'body-care', label: 'Chăm sóc cơ thể' },
  { id: 'mask', label: 'Mặt nạ' },
  { id: 'lip-care', label: 'Chăm sóc môi' },
] as const

export const featuredProductCategories: readonly ProductFeaturedCategory[] = [
  {
    id: 'skincare',
    label: 'Chăm sóc da',
    description: 'Làm sạch và nuôi dưỡng',
    icon: 'droplets',
    href: '/products?category=skincare',
    tone: 'sage',
  },
  {
    id: 'makeup',
    label: 'Trang điểm',
    description: 'Sắc màu nhẹ nhàng',
    icon: 'palette',
    href: '/products?category=makeup',
    tone: 'rose',
  },
  {
    id: 'hair-care',
    label: 'Chăm sóc tóc',
    description: 'Mềm mượt mỗi ngày',
    icon: 'scissors',
    href: '/products?category=hair-care',
    tone: 'sand',
  },
  {
    id: 'body-care',
    label: 'Chăm sóc cơ thể',
    description: 'Thư giãn và cân bằng',
    icon: 'flower',
    href: '/products?category=body-care',
    tone: 'mint',
  },
  {
    id: 'branch-service',
    label: 'Dịch vụ chi nhánh',
    description: 'Trải nghiệm tại Mizuki',
    icon: 'building',
    href: '/skin-care',
    tone: 'powder',
  },
  {
    id: 'spa-skin-care',
    label: 'Spa & chăm sóc da',
    description: 'Liệu trình và tư vấn da tại Mizuki',
    icon: 'sparkles',
    href: '/skin-care',
    tone: 'apricot',
  },
  {
    id: 'new',
    label: 'Sản phẩm mới',
    description: 'Lựa chọn vừa cập nhật',
    icon: 'new',
    href: '/products?highlight=new',
    tone: 'sage',
  },
  {
    id: 'offers',
    label: 'Ưu đãi hôm nay',
    description: 'Mức giá demo dễ chọn',
    icon: 'tags',
    href: '/products?highlight=discounted',
    tone: 'rose',
  },
] as const

export const productBrandPromotions: readonly ProductCategoryBrand[] = [
  {
    id: 'cerave',
    name: 'CeraVe',
    initials: 'C',
    tone: 'sky',
    description: 'Làm sạch và dưỡng ẩm',
    productCount: 12,
  },
  {
    id: 'la-roche-posay',
    name: 'La Roche-Posay',
    initials: 'LR',
    tone: 'sky',
    description: 'Dịu nhẹ cho da',
    productCount: 10,
  },
  {
    id: 'eucerin',
    name: 'Eucerin',
    initials: 'E',
    tone: 'rose',
    description: 'Chăm sóc chuyên biệt',
    productCount: 8,
  },
  {
    id: 'bioderma',
    name: 'Bioderma',
    initials: 'B',
    tone: 'lilac',
    description: 'Cân bằng làn da',
    productCount: 11,
  },
  {
    id: 'vichy',
    name: 'Vichy',
    initials: 'V',
    tone: 'mint',
    description: 'Khoáng chất và phục hồi',
    productCount: 7,
  },
  {
    id: 'skin1004',
    name: 'SKIN1004',
    initials: 'S1',
    tone: 'sand',
    description: 'Tối giản từ rau má',
    productCount: 9,
  },
  {
    id: 'garnier',
    name: 'Garnier',
    initials: 'G',
    tone: 'mint',
    description: 'Sáng da mỗi ngày',
    productCount: 13,
  },
  {
    id: 'klairs',
    name: 'Klairs',
    initials: 'K',
    tone: 'lilac',
    description: 'Êm dịu và cân bằng',
    productCount: 6,
  },
  {
    id: 'avene',
    name: 'Avène',
    initials: 'A',
    tone: 'rose',
    description: 'Làm dịu da nhạy cảm',
    productCount: 8,
  },
  {
    id: 'cetaphil',
    name: 'Cetaphil',
    initials: 'C',
    tone: 'sky',
    description: 'Chăm sóc da dịu nhẹ',
    productCount: 10,
  },
  {
    id: 'svr',
    name: 'SVR',
    initials: 'SVR',
    tone: 'mint',
    description: 'Giải pháp da chuyên biệt',
    productCount: 7,
  },
  {
    id: 'paulas-choice',
    name: 'Paula’s Choice',
    initials: 'PC',
    tone: 'sand',
    description: 'Chăm sóc theo hoạt chất',
    productCount: 9,
  },
] as const

export const brandFilterOptions: readonly ProductFilterOption[] = [
  { id: 'mizuki-lab', label: 'Mizuki Lab', count: 4 },
  { id: 'aoi-care', label: 'Aoi Care', count: 3 },
  { id: 'hana-studio', label: 'Hana Studio', count: 3 },
  { id: 'kinu-beauty', label: 'Kinu Beauty', count: 3 },
  { id: 'mori', label: 'Mori Essentials', count: 2 },
  { id: 'sora', label: 'Sora', count: 2 },
  { id: 'nami', label: 'Nami', count: 2 },
  { id: 'tsuki', label: 'Tsuki Daily', count: 1 },
] as const

export const concernFilterOptions: readonly ProductFilterOption[] = [
  { id: 'hydration', label: 'Cấp ẩm', count: 8 },
  { id: 'sensitive', label: 'Da nhạy cảm', count: 6 },
  { id: 'acne', label: 'Da dễ nổi mụn', count: 5 },
  { id: 'brightening', label: 'Làm sáng', count: 5 },
  { id: 'oil-control', label: 'Kiểm soát dầu', count: 4 },
] as const

export const productSortOptions: readonly ProductSortOption[] = [
  { value: 'popular', label: 'Phổ biến' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-ascending', label: 'Giá tăng dần' },
  { value: 'price-descending', label: 'Giá giảm dần' },
  { value: 'best-selling', label: 'Bán chạy' },
] as const

export const defaultProductFilters: ProductFilterState = {
  categoryIds: [],
  brandIds: [],
  concernIds: [],
  priceRange: 'all',
  minimumRating: null,
  highlights: [],
  inStockOnly: false,
}

const productNames = [
  'Gel làm sạch dịu nhẹ cân bằng da',
  'Nước tẩy trang cho da nhạy cảm',
  'Serum cấp ẩm phục hồi hàng rào da',
  'Tinh chất làm sáng da nhẹ nhàng',
  'Kem dưỡng khóa ẩm ban đêm',
  'Gel dưỡng kiểm soát dầu',
  'Kem chống nắng mỏng nhẹ SPF 50',
  'Sữa chống nắng nâng tông tự nhiên',
  'Mặt nạ cấp ẩm thư giãn làn da',
  'Mặt nạ đất sét làm sạch lỗ chân lông',
  'Son dưỡng sắc màu tự nhiên',
  'Phấn má hiệu ứng trong trẻo',
  'Dầu gội nuôi dưỡng tóc mềm mượt',
  'Dầu xả phục hồi tóc khô',
  'Sữa tắm hương trà xanh',
  'Kem dưỡng thể mềm mịn',
  'Sữa rửa mặt tạo bọt mềm',
  'Serum làm dịu da sau nắng',
  'Kem dưỡng môi ban đêm',
  'Xịt khoáng cấp ẩm tức thì',
] as const

const productTones = ['mint', 'rose', 'sand', 'sky', 'lilac'] as const
const categorySequence = [
  'cleanser',
  'cleanser',
  'serum',
  'serum',
  'moisturizer',
  'moisturizer',
  'sun-care',
  'sun-care',
  'mask',
  'mask',
  'lip-care',
  'makeup',
  'hair-care',
  'hair-care',
  'body-care',
  'body-care',
  'cleanser',
  'serum',
  'lip-care',
  'moisturizer',
] as const
const brandSequence = [
  'mizuki-lab',
  'aoi-care',
  'hana-studio',
  'kinu-beauty',
  'mori',
  'sora',
  'nami',
  'tsuki',
] as const
const concernSequence = [
  ['sensitive', 'hydration'],
  ['sensitive'],
  ['hydration'],
  ['brightening'],
  ['hydration'],
  ['oil-control', 'acne'],
  ['sensitive'],
  ['brightening'],
  ['hydration'],
  ['oil-control', 'acne'],
] as const
const productSlugs = [
  'gel-lam-sach-diu-nhe-can-bang-da',
  'serum-phuc-hoi-hang-rao-bao-ve-da',
  'kem-chong-nang-mong-nhe-spf50',
  'nuoc-tay-trang-diu-nhe',
  'kem-duong-am-sau-ban-dem',
  'toner-can-bang-khong-con',
  'mat-na-cap-am-chuyen-sau',
  'sua-rua-mat-tao-bot-min',
  'tinh-chat-duong-sang-da',
  'kem-duong-phuc-hoi-da',
  'dau-tay-trang-thuc-vat',
  'xit-khoang-lam-diu',
  'gel-duong-am-mong-nhe',
  'kem-mat-giam-dau-hieu-met-moi',
  'tinh-chat-bha-lam-sach-lo-chan-long',
  'son-duong-co-mau',
  'phan-phu-kiem-dau',
  'dau-goi-phuc-hoi-toc',
  'dau-xa-duong-muot',
  'kem-u-toc-chuyen-sau',
] as const

export const productListingProducts: readonly ProductListingProduct[] = productNames.map(
  (name, index) => {
    const hasDiscount = index % 3 !== 1
    const isBestseller = index === 0 || index === 3 || index === 6 || index === 12
    const isNew = index === 2 || index === 7 || index === 17 || index === 19
    const stockState = index === 15
      ? 'sold_out' as const
      : index === 5 || index === 13
        ? 'low' as const
        : 'available' as const
    const price = 119000 + index * 39000

    return {
      id: `listing-${index + 1}`,
      slug: productSlugs[index] ?? `san-pham-demo-${index + 1}`,
      name,
      brand: brandFilterOptions[index % brandFilterOptions.length]?.label ?? 'Mizuki Lab',
      brandId: brandSequence[index % brandSequence.length] ?? 'mizuki-lab',
      categoryId: categorySequence[index] ?? 'serum',
      concernIds: concernSequence[index % concernSequence.length] ?? ['hydration'],
      tone: productTones[index % productTones.length] ?? 'mint',
      price,
      originalPrice: hasDiscount ? price + 70000 + index * 5000 : undefined,
      discountPercent: hasDiscount ? 15 + (index % 4) * 5 : undefined,
      rating: 4.4 + (index % 5) * 0.1,
      reviewCount: 28 + index * 13,
      soldCount: 18 + index * 6,
      stockState,
      badge: isBestseller ? 'Bán chạy' : isNew ? 'Mới' : undefined,
      isNew,
      isBestseller,
      popularity: 100 - index * 3 + (isBestseller ? 20 : 0),
      createdOrder: isNew ? 100 + index : index,
    }
  },
)

export const suggestedProducts: readonly ProductListingProduct[] = [
  ...productListingProducts.slice(2, 6),
  ...productListingProducts.slice(16, 20),
]
