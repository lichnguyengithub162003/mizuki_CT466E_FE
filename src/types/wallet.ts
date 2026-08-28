export interface CustomerWalletDto {
  readonly id: number
  readonly balance: number
  readonly currency: 'VND'
  readonly updated_at: string
}

export interface CustomerWalletResponse {
  readonly success: true
  readonly data: CustomerWalletDto
  readonly message: string
  readonly meta: Readonly<Record<string, unknown>>
}

export interface CustomerWallet {
  readonly id: number
  readonly balance: number
  readonly currency: 'VND'
  readonly updatedAt: string
}
