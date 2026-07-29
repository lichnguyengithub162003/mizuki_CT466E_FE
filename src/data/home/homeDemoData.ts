import type {
  HomeBrand,
  HomeCategory,
  HomeHeroSlide,
  HomeProduct,
  HomePromotion,
  HomeQuickLink,
} from '@/types/home'

export const homeCategories: readonly HomeCategory[] = [
  {
    id: 'skincare',
    label: 'Chăm sóc da',
    icon: 'droplets',
    href: '/home#featured',
    featured: true,
    children: [
      {
        id: 'cleansing',
        label: 'Làm sạch',
        icon: 'droplets',
        href: '/home#featured',
        children: [
          { id: 'cleanser', label: 'Sữa rửa mặt', icon: 'droplets', href: '/home#featured' },
          { id: 'makeup-remover', label: 'Tẩy trang', icon: 'droplets', href: '/home#featured' },
        ],
      },
      {
        id: 'nourishing',
        label: 'Dưỡng da',
        icon: 'sparkles',
        href: '/home#featured',
        children: [
          { id: 'serum', label: 'Serum', icon: 'sparkles', href: '/home#featured' },
          { id: 'moisturizer', label: 'Kem dưỡng', icon: 'sparkles', href: '/home#featured' },
        ],
      },
    ],
  },
  {
    id: 'makeup',
    label: 'Trang điểm',
    icon: 'palette',
    href: '/home#featured',
    children: [
      { id: 'face-makeup', label: 'Trang điểm mặt', icon: 'palette', href: '/home#featured' },
      { id: 'lip-makeup', label: 'Trang điểm môi', icon: 'palette', href: '/home#featured' },
    ],
  },
  {
    id: 'haircare',
    label: 'Chăm sóc tóc',
    icon: 'scissors',
    href: '/home#recommended',
    children: [
      { id: 'shampoo', label: 'Dầu gội', icon: 'scissors', href: '/home#recommended' },
      { id: 'conditioner', label: 'Dầu xả', icon: 'scissors', href: '/home#recommended' },
    ],
  },
  { id: 'bodycare', label: 'Chăm sóc cơ thể', icon: 'flower', href: '/home#recommended' },
  { id: 'sun-care', label: 'Chống nắng', icon: 'sun', href: '/home#featured', featured: true },
  { id: 'fragrance', label: 'Hương thơm', icon: 'flower', href: '/home#recommended' },
  { id: 'services', label: 'Dịch vụ tại chi nhánh', icon: 'building', href: '/home#promotions' },
  { id: 'new-arrivals', label: 'Sản phẩm mới', icon: 'new', href: '/home#recommended' },
  { id: 'offers', label: 'Ưu đãi hôm nay', icon: 'tags', href: '/home#flash-sale', featured: true },
  { id: 'gifts', label: 'Quà tặng', icon: 'gift', href: '/home#promotions' },
] as const

export const homeHeroSlides: readonly HomeHeroSlide[] = [
  {
    id: 'skin-reset',
    eyebrow: 'Chăm da đầu mùa',
    title: 'Khởi động chu trình da căng khỏe',
    description: 'Gợi ý minh họa cho bước làm sạch và dưỡng ẩm dịu nhẹ mỗi ngày.',
    ctaLabel: 'Khám phá chăm sóc da',
    tone: 'sage',
    decorativeVariant: 'bottle',
  },
  {
    id: 'beauty-gift',
    eyebrow: 'Quà tặng Mizuki',
    title: 'Thêm niềm vui vào mỗi đơn hàng',
    description: 'Ưu đãi demo được trình bày rõ ràng, không sử dụng dữ liệu bán hàng thật.',
    ctaLabel: 'Xem ưu đãi',
    tone: 'apricot',
    decorativeVariant: 'gift',
  },
  {
    id: 'branch-care',
    eyebrow: 'Chăm sóc tại chi nhánh',
    title: 'Một khoảng nghỉ nhẹ nhàng cho làn da',
    description: 'Khám phá trải nghiệm demo tại chi nhánh Mizuki đang được chọn.',
    ctaLabel: 'Xem dịch vụ',
    tone: 'periwinkle',
    decorativeVariant: 'service',
  },
] as const

export const homeQuickLinks: readonly HomeQuickLink[] = [
  { id: 'offers', label: 'Săn ưu đãi', icon: 'tags', href: '/home#flash-sale' },
  { id: 'skincare', label: 'Chăm sóc da', icon: 'droplets', href: '/home#featured' },
  { id: 'makeup', label: 'Trang điểm', icon: 'palette', href: '/home#featured' },
  { id: 'haircare', label: 'Chăm sóc tóc', icon: 'scissors', href: '/home#recommended' },
  { id: 'services', label: 'Dịch vụ chi nhánh', icon: 'building', href: '/home#promotions' },
  { id: 'brands', label: 'Thương hiệu', icon: 'sparkles', href: '/home#brands' },
  { id: 'new', label: 'Sản phẩm mới', icon: 'new', href: '/home#recommended' },
  { id: 'again', label: 'Mua lại', icon: 'history', href: '/home#recommended' },
] as const

const productNames = [
  'Gel làm sạch dịu nhẹ cho da',
  'Serum cấp ẩm phục hồi',
  'Kem chống nắng mỏng nhẹ',
  'Son dưỡng sắc màu tự nhiên',
  'Mặt nạ thư giãn làn da',
  'Dầu gội nuôi dưỡng tóc',
  'Kem dưỡng khóa ẩm ban đêm',
  'Nước cân bằng làn da',
  'Phấn má hiệu ứng trong trẻo',
  'Dầu xả mềm mượt hằng ngày',
] as const

const productTones = ['mint', 'rose', 'sand', 'sky', 'lilac'] as const

export const flashSaleProducts: readonly HomeProduct[] = productNames.map((name, index) => ({
  id: `flash-${index + 1}`,
  name,
  brand: ['Mizuki Lab', 'Aoi Care', 'Hana Studio'][index % 3] ?? 'Mizuki Lab',
  tone: productTones[index % productTones.length] ?? 'mint',
  price: 129000 + index * 27000,
  originalPrice: 189000 + index * 35000,
  discountPercent: 18 + (index % 4) * 5,
  rating: 4.6 + (index % 3) * 0.1,
  reviewCount: 24 + index * 11,
  soldCount: 18 + index * 7,
  stockState: index === 8 ? 'sold_out' : index === 6 ? 'low' : 'available',
  badge: index < 3 ? 'Bán chạy' : undefined,
}))

export const featuredProducts: readonly HomeProduct[] = flashSaleProducts.slice(0, 8).map(
  (product, index) => ({
    ...product,
    id: `featured-${index + 1}`,
    discountPercent: index % 2 === 0 ? product.discountPercent : undefined,
    originalPrice: index % 2 === 0 ? product.originalPrice : undefined,
  }),
)

export const recommendedProducts: readonly HomeProduct[] = [...productNames].reverse().map(
  (name, index) => ({
    id: `recommended-${index + 1}`,
    name,
    brand: ['Kinu Beauty', 'Mori Essentials', 'Mizuki Lab'][index % 3] ?? 'Mizuki Lab',
    tone: productTones[(index + 2) % productTones.length] ?? 'mint',
    price: 159000 + index * 31000,
    originalPrice: index % 3 === 0 ? 229000 + index * 33000 : undefined,
    discountPercent: index % 3 === 0 ? 20 : undefined,
    rating: 4.7,
    reviewCount: 31 + index * 9,
    soldCount: 12 + index * 5,
    stockState: index === 7 ? 'low' : 'available',
    badge: index === 0 ? 'Mới' : undefined,
  }),
)

export const homeBrands: readonly HomeBrand[] = [
  { id: 'mizuki-lab', name: 'MIZUKI LAB', accent: '#c5d4ca', description: 'Chăm sóc tối giản' },
  { id: 'aoi-care', name: 'AOI CARE', accent: '#d9e8ef', description: 'Dịu nhẹ mỗi ngày' },
  { id: 'hana-studio', name: 'HANA STUDIO', accent: '#f2d4c4', description: 'Sắc màu tinh tế' },
  { id: 'kinu-beauty', name: 'KINU BEAUTY', accent: '#d9def3', description: 'Mềm mại và hiện đại' },
  { id: 'mori', name: 'MORI', accent: '#dce5d2', description: 'Cảm hứng thiên nhiên' },
  { id: 'sora', name: 'SORA', accent: '#d9e8ef', description: 'Trong trẻo hằng ngày' },
  { id: 'nami', name: 'NAMI', accent: '#eadbc3', description: 'Chăm sóc cân bằng' },
] as const

export const homePromotions: readonly HomePromotion[] = [
  {
    id: 'branch-offer',
    title: 'Ưu đãi theo chi nhánh',
    description: 'Xem quyền lợi demo phù hợp với chi nhánh bạn đang chọn.',
    ctaLabel: 'Khám phá ưu đãi',
    tone: 'sage',
  },
  {
    id: 'order-gift',
    title: 'Quà tặng đơn hàng',
    description: 'Minh họa chương trình quà tặng theo giá trị đơn.',
    ctaLabel: 'Xem quà tặng',
    tone: 'apricot',
  },
  {
    id: 'skin-service',
    title: 'Dịch vụ chăm sóc da',
    description: 'Tìm hiểu trải nghiệm demo tại hệ thống Mizuki.',
    ctaLabel: 'Xem dịch vụ',
    tone: 'powder',
  },
] as const
