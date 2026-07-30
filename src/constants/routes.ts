export const ROUTE_NAMES = {
  foundation: 'foundation',
  products: 'products',
  productDetail: 'product-detail',
  skinCare: 'skin-care',
  forbidden: 'forbidden',
  notFound: 'not-found',
} as const

export const ROUTE_PATHS = {
  foundation: '/',
  products: '/products',
  productDetail: '/products/:slug',
  skinCare: '/skin-care',
  forbidden: '/forbidden',
  notFoundExample: '/khong-ton-tai',
} as const
