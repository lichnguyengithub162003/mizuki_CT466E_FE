import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addCustomerFavorite,
  getCustomerFavorites,
  removeCustomerFavorite,
} from '@/api/favoritesApi'

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/api/clients', () => ({ apiClient: client }))

const favoriteDto = {
  id: 41,
  name: 'Serum thật',
  slug: 'serum-that',
  primary_image_url: '/storage/products/serum.jpg',
  minimum_price: '150000',
  brand: { id: 8, name: 'Cocoon', slug: 'cocoon' },
  original_price: 190000,
  stock_state: 'low-stock' as const,
}

afterEach(() => {
  client.get.mockReset()
  client.post.mockReset()
  client.delete.mockReset()
})

describe('favorites API', () => {
  it('loads every backend page and adapts only returned product fields', async () => {
    client.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          message: 'OK',
          data: [favoriteDto],
          meta: { pagination: { current_page: 1, last_page: 2 } },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          message: 'OK',
          data: [{
            ...favoriteDto,
            id: 42,
            name: 'Kem dưỡng thật',
            slug: 'kem-duong-that',
            primary_image_url: null,
            brand: null,
            original_price: null,
            stock_state: 'sold-out',
          }],
          meta: { pagination: { current_page: 2, last_page: 2 } },
        },
      })

    await expect(getCustomerFavorites(6)).resolves.toEqual([
      {
        productId: 41,
        name: 'Serum thật',
        slug: 'serum-that',
        imageUrl: 'http://localhost:8000/storage/products/serum.jpg',
        minimumPrice: 150000,
        brand: { id: 8, name: 'Cocoon', slug: 'cocoon' },
        originalPrice: 190000,
        stockState: 'low-stock',
      },
      {
        productId: 42,
        name: 'Kem dưỡng thật',
        slug: 'kem-duong-that',
        minimumPrice: 150000,
        brand: null,
        originalPrice: null,
        stockState: 'sold-out',
      },
    ])
    expect(client.get).toHaveBeenNthCalledWith(1, '/customer/favorites', { params: { page: 1, branch_id: 6 } })
    expect(client.get).toHaveBeenNthCalledWith(2, '/customer/favorites', { params: { page: 2, branch_id: 6 } })
  })

  it('uses the product-ID add and remove contracts', async () => {
    client.post.mockResolvedValueOnce({ data: { success: true, message: 'Đã thêm', data: favoriteDto } })
    client.delete.mockResolvedValueOnce({ data: { success: true, message: 'Đã bỏ', data: null } })

    await expect(addCustomerFavorite(41, 6)).resolves.toMatchObject({ productId: 41, minimumPrice: 150000 })
    await expect(removeCustomerFavorite(41)).resolves.toBeUndefined()
    expect(client.post).toHaveBeenCalledWith('/customer/favorites', { product_id: 41, branch_id: 6 })
    expect(client.delete).toHaveBeenCalledWith('/customer/favorites/41')
  })
})
