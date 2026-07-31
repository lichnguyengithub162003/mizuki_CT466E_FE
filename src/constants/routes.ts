export const ROUTE_NAMES = {
  foundation: 'foundation',
  products: 'products',
  productDetail: 'product-detail',
  favorites: 'favorites',
  cart: 'cart',
  checkout: 'checkout',
  skinCare: 'skin-care',
  forbidden: 'forbidden',
  notFound: 'not-found',
} as const

export const ROUTE_PATHS = {
  foundation: '/',
  products: '/products',
  productDetail: '/products/:slug',
  favorites: '/favorites',
  cart: '/cart',
  checkout: '/checkout',
  skinCare: '/skin-care',
  forbidden: '/forbidden',
  notFoundExample: '/khong-ton-tai',
} as const
