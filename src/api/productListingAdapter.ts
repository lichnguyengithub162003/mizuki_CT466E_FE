import type {
  ProductDetailResponseDto,
  ProductListingItemDto,
  ProductListingResponseDto,
  ProductReviewsResponseDto,
} from "@/api/productListingApi";
import type { ProductDetail, ProductListingProduct } from "@/types/products";

const BACKEND_ORIGIN = "http://localhost:8000";
export const PRODUCT_LISTING_FALLBACK_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480"%3E%3Crect width="480" height="480" rx="36" fill="%23e3f1eb"/%3E%3Cpath d="M166 178h148v148H166z" fill="none" stroke="%232f6f58" stroke-width="18"/%3E%3Cpath d="m166 178 74 48 74-48M240 226v100" fill="none" stroke="%232f6f58" stroke-width="18"/%3E%3C/svg%3E';

export interface ProductListingPagination {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
}

export interface ProductListingResult {
  products: ProductListingProduct[];
  pagination: ProductListingPagination;
}

interface ProductDetailImageSourceDto {
  readonly id: number | string;
  readonly image_url: string;
  readonly alt_text?: string | null;
  readonly sort_order?: number;
}

interface ProductDetailVariantSourceDto {
  readonly id: number | string;
  readonly name: string;
  readonly sku?: string;
  readonly attributes?: Readonly<
    Record<string, string | number | boolean | null>
  >;
  readonly price?: number | string | null;
  readonly sale_price?: number | string | null;
  readonly effective_price?: number | string | null;
  readonly total_available_quantity?: number | string | null;
  readonly available: boolean;
}

interface ProductDetailBranchSourceDto {
  readonly variant_id?: number | string;
  readonly branch_id: number | string;
  readonly branch_name: string;
  readonly available_quantity?: number | string | null;
}

/**
 * `data.product` chỉ chứa phần mô tả/nội dung tĩnh của sản phẩm.
 * KHÔNG chứa gallery/variants/prices/rating/branch_availability/related_products
 * — các field đó nằm ở root của `data` (xem ProductDetailDataSourceDto bên dưới).
 */
export interface ProductDetailProductSourceDto {
  readonly id: number | string;
  readonly slug: string;
  readonly name: string;
  readonly short_description?: string | null;
  readonly description?: string | null;
  readonly ingredients?: string | null;
  readonly usage_instructions?: string | null;
}

export interface ProductDetailBrandSourceDto {
  readonly id?: number | null;
  readonly name?: string | null;
  readonly slug?: string | null;
  readonly logo_url?: string | null;
  readonly active_product_count?: number | string | null;
  readonly average_rating?: number | string | null;
  readonly review_count?: number | string | null;
  readonly follower_count?: number | string | null;
  readonly is_following?: boolean | null;
}

export interface ProductDetailReviewSourceDto {
  readonly id: number | string;
  readonly rating: number;
  readonly customer_name?: string | null;
  readonly reviewer_name?: string | null;
  readonly title?: string | null;
  readonly headline?: string | null;
  readonly comment?: string | null;
  readonly content?: string | null;
  readonly images?: readonly string[] | null;
  readonly image_urls?: readonly string[] | null;
  readonly helpful_count?: number | string | null;
  readonly is_verified_purchase?: boolean | null;
  readonly created_at?: string | null;
}

interface ProductVariantGroupProductSourceDto {
  readonly image?: string | null;
  readonly price?: number | string | null;
  readonly quantity?: number | string | null;
  readonly option_id: number | string;
  readonly source_sku?: string | null;
  readonly source_url?: string | null;
  readonly external_id: string;
  readonly product_id: number | string | null;
  readonly slug: string | null;
  readonly name: string | null;
}

interface ProductVariantGroupOptionSourceDto {
  readonly id: number | string;
  readonly image?: string | null;
  readonly label: string;
  readonly long_label?: string | null;
  readonly is_default?: boolean | null;
  readonly is_hot?: boolean | null;
  readonly products: readonly ProductVariantGroupProductSourceDto[];
}

interface ProductVariantGroupSourceDto {
  readonly id: number | string;
  readonly code: string;
  readonly label: string;
  readonly options: readonly ProductVariantGroupOptionSourceDto[];
  readonly selected?: string | null;
  readonly display_type: "image" | "text";
}

/**
 * Shape thật của `response.data` theo backend hiện tại.
 * `product` chỉ là subset mô tả; mọi field thương mại (gallery, variants,
 * prices, rating, branch_availability, related_products) và `reviews` /
 * `questions_and_answers` nằm NGANG HÀNG với `product`, không lồng bên trong.
 */
export interface ProductDetailSourceResponseDto {
  readonly success: boolean;
  readonly message: string;
  readonly data: {
    readonly product: ProductDetailProductSourceDto;
    readonly specifications?: Readonly<
      Record<string, string | number | boolean | null>
    > | null;
    readonly origin_country?: string | null;
    readonly brand?: ProductDetailBrandSourceDto | null;
    readonly images?: readonly ProductDetailImageSourceDto[] | null;
    readonly gallery?: readonly ProductDetailImageSourceDto[] | null;
    readonly variants?: readonly ProductDetailVariantSourceDto[] | null;
    readonly variant_groups?: readonly ProductVariantGroupSourceDto[] | null;
    readonly prices?: {
      readonly minimum?: number | string | null;
      readonly maximum?: number | string | null;
    } | null;
    readonly rating?: number | string | null;
    readonly review_count?: number | string | null;
    readonly branch_availability?:
      | readonly ProductDetailBranchSourceDto[]
      | null;
    readonly related_products?:
      | readonly { readonly id: number | string }[]
      | null;
    readonly reviews?: readonly ProductDetailReviewSourceDto[] | null;
    readonly questions_and_answers?: readonly ProductDetailQaSourceDto[] | null;
  };
}

function finiteNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function resolveProductImage(value: string | null | undefined): string {
  const image = value?.trim();
  if (!image) return PRODUCT_LISTING_FALLBACK_IMAGE;
  if (/placehold\.co/i.test(image)) return PRODUCT_LISTING_FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(image)) return image;
  return `${BACKEND_ORIGIN}${image.startsWith("/") ? image : `/${image}`}`;
}

export function resolveCatalogAsset(
  value: string | null | undefined,
): string | undefined {
  const asset = value?.trim();
  if (!asset) return undefined;
  if (/^https?:\/\//i.test(asset)) return asset;
  if (asset.startsWith("/storage/")) return `${BACKEND_ORIGIN}${asset}`;

  const normalized = asset.replace(/^\/+/, "");
  if (normalized.startsWith("storage/"))
    return `${BACKEND_ORIGIN}/${normalized}`;
  if (normalized.startsWith("catalog/brands/")) {
    return `${BACKEND_ORIGIN}/storage/${normalized}`;
  }
  return `${BACKEND_ORIGIN}/storage/catalog/brands/${normalized}`;
}

/**
 * Resolve ảnh tĩnh trong `storage/app/public/catalog/transports`
 * (icon COD, freeship...). Khác với resolveCatalogAsset (dữ liệu động
 * từ backend như logo brand), đây là asset tĩnh do frontend tự đặt tên.
 */
export function resolveTransportAsset(filename: string): string {
  const normalized = filename.replace(/^\/+/, "");
  return `${BACKEND_ORIGIN}/storage/catalog/transports/${normalized}`;
}

function effectivePrice(product: ProductListingItemDto): number {
  return (
    finiteNumber(product.default_variant?.effective_price) ??
    finiteNumber(product.minimum_price) ??
    finiteNumber(product.price) ??
    0
  );
}

export function adaptProductListItem(
  product: ProductListingItemDto,
): ProductListingProduct {
  const price = effectivePrice(product);
  const originalPrice = finiteNumber(product.original_price);
  const discountPercent = finiteNumber(product.discount?.percentage);

  return {
    id: String(product.id),
    slug: product.slug,
    name: product.name,
    brand: product.brand.name,
    brandId: String(product.brand.id),
    categoryId: String(product.category.id),
    tone: "mint",
    imageUrl: resolveProductImage(
      product.primary_image_url ?? product.primary_image,
    ),
    defaultVariantId: product.default_variant?.id,
    price,
    originalPrice:
      product.has_discount && originalPrice !== null && originalPrice > price
        ? originalPrice
        : undefined,
    discountPercent:
      product.has_discount && discountPercent !== null && discountPercent > 0
        ? Math.round(discountPercent)
        : undefined,
    rating: finiteNumber(product.rating) ?? 0,
    reviewCount: Math.max(0, product.review_count),
    stockState: !product.availability.available
      ? "sold_out"
      : product.availability.available_quantity <= 5
        ? "low"
        : "available",
  };
}

export function adaptProductListing(
  response: ProductListingResponseDto,
): ProductListingResult {
  const pagination = response.meta.pagination;
  return {
    products: response.data.map(adaptProductListItem),
    pagination: {
      currentPage: pagination.current_page,
      perPage: pagination.per_page,
      total: pagination.total,
      lastPage: pagination.last_page,
    },
  };
}

function richTextToLines(value: string | null | undefined): string[] {
  if (!value) return [];
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text ? [text] : [];
}

function detailStockState(quantity: number): ProductDetail["stockState"] {
  if (quantity <= 0) return "out-of-stock";
  return quantity <= 5 ? "low-stock" : "available";
}

function detailStockLabel(quantity: number): string {
  if (quantity <= 0) return "Tạm hết hàng";
  return quantity <= 5 ? "Sắp hết hàng" : "Còn hàng";
}
function adaptVariantGroups(
  groups: readonly ProductVariantGroupSourceDto[] | null | undefined,
): ProductVariantGroup[] {
  return (groups ?? []).map((group) => ({
    id: String(group.id),
    label: group.label,
    displayType: group.display_type === "image" ? "image" : "text",
    selectedLabel: group.selected?.trim() || null,
    options: group.options.map((option) => ({
      id: String(option.id),
      label: option.label,
      imageUrl: option.image?.trim() ? option.image : undefined,
      isDefault: Boolean(option.is_default),
      products: option.products.map((product) => ({
        externalId: String(product.external_id),
        productId:
          product.product_id === null || product.product_id === undefined
            ? null
            : String(product.product_id),
        slug: product.slug?.trim() || null,
        name: product.name?.trim() || null,
        price: finiteNumber(product.price),
      })),
    })),
  }));
}
export function adaptProductDetail(
  response: ProductDetailSourceResponseDto,
): ProductDetail;
export function adaptProductDetail(
  response: ProductDetailResponseDto,
): ProductDetail;
export function adaptProductDetail(
  response: ProductDetailSourceResponseDto | ProductDetailResponseDto,
): ProductDetail {
  if (!("product" in response.data)) {
    throw new Error("Invalid Product Detail response: expected data.product");
  }
  const detail = response.data.product;

  const root = response.data as ProductDetailSourceResponseDto["data"];

  const brand = root.brand;

  const reviews = Array.isArray(root.reviews) ? root.reviews : [];

  const questions = Array.isArray(root.questions_and_answers)
    ? root.questions_and_answers
    : [];

  const variants = Array.isArray(root.variants) ? root.variants : [];
  const variantGroupsRaw = adaptVariantGroups(root.variant_groups);

  const galleryImages = Array.isArray(root.gallery) ? root.gallery : [];

  const productImages = Array.isArray(root.images) ? root.images : [];

  const branchAvailability = Array.isArray(root.branch_availability)
    ? root.branch_availability
    : [];

  const relatedProducts = Array.isArray(root.related_products)
    ? root.related_products
    : [];

  const totalQuantity = variants.reduce(
    (total, variant) =>
      total + Math.max(0, finiteNumber(variant.total_available_quantity) ?? 0),
    0,
  );

  const sourceImages = galleryImages.length > 0 ? galleryImages : productImages;

  const images = sourceImages.map((image, index) => ({
    id: String(image.id),
    label: `Ảnh ${index + 1}`,
    alt: image.alt_text?.trim() || detail.name,
    tone: (["sage", "mint", "sand", "rose", "sky"] as const)[index % 5],
    imageUrl: resolveProductImage(image.image_url),
  }));

  const variantPrices = variants
    .map((variant) => finiteNumber(variant.effective_price))
    .filter((value): value is number => value !== null && value > 0)
    .sort((a, b) => a - b);

  const price = finiteNumber(root.prices?.minimum) ?? variantPrices[0] ?? 0;

  const cheapestVariant = [...variants]
    .filter((variant) => (finiteNumber(variant.effective_price) ?? 0) > 0)
    .sort(
      (a, b) =>
        (finiteNumber(a.effective_price) ?? 0) -
        (finiteNumber(b.effective_price) ?? 0),
    )[0];

  const originalPriceValue = finiteNumber(cheapestVariant?.price);
  const hasDiscount =
    originalPriceValue !== null && originalPriceValue > price && price > 0;

  const discountPercent = hasDiscount
    ? Math.round(((originalPriceValue - price) / originalPriceValue) * 100)
    : null;

  return {
    id: String(detail.id),
    slug: detail.slug,
    name: detail.name,
    brand: {
      id: finiteNumber(brand?.id) ?? undefined,
      name: brand?.name?.trim() || "Thương hiệu chưa cập nhật",
      slug: brand?.slug?.trim() || undefined,
      logoUrl: resolveCatalogAsset(brand?.logo_url),
      initials: (brand?.name?.trim() || "?")
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
      origin: root.origin_country?.trim() || "Chưa có thông tin",
      description: "",
      rating: finiteNumber(brand?.average_rating) ?? undefined,
      reviewCount: finiteNumber(brand?.review_count) ?? undefined,
      productCount: finiteNumber(brand?.active_product_count) ?? undefined,
      followerCount: finiteNumber(brand?.follower_count) ?? 0,
      isFollowing: Boolean(brand?.is_following),
      isOfficial: true,
    },
    images,
    currentPrice: price,
    originalPrice: hasDiscount ? originalPriceValue : undefined,
    discountLabel:
      discountPercent !== null && discountPercent > 0
        ? `-${discountPercent}%`
        : undefined,
    rating: finiteNumber(root.rating) ?? 0,
    reviewCount: finiteNumber(root.review_count) ?? 0,
    soldCount: 0,
    badges: [],
    sellingPoints: richTextToLines(detail.short_description),
    shippingSummary: "Thông tin giao hàng được xác nhận khi đặt hàng.",
    destinationSummary: "Tồn kho hiển thị theo chi nhánh đã chọn.",
    stockState: detailStockState(totalQuantity),
    stockLabel: detailStockLabel(totalQuantity),
    maxQuantity: Math.max(1, Math.min(totalQuantity, 99)),
    variants:
      variants.length > 0
        ? [
            {
              id: "variant",
              label: "Phân loại",
              options: variants.map((variant) => ({
                id: String(variant.id),
                label: variant.name,
                available: variant.available,
                selected: false,
              })),
            },
          ]
        : [],
    variantGroups: variantGroupsRaw,
    description: richTextToLines(detail.description),
    ingredients: richTextToLines(detail.ingredients),
    usage: richTextToLines(detail.usage_instructions),
    specifications: Object.entries(root.specifications ?? {}).flatMap(
      ([label, value]) =>
        value === null || value === ""
          ? []
          : [
              {
                label: label.trim(),
                value: String(value)
                  .replace(/\u200B/g, "")
                  .trim(),
              },
            ],
    ),
    reviews: reviews.map((review) => ({
      id: String(review.id),
      author:
        review.customer_name?.trim() ||
        review.reviewer_name?.trim() ||
        undefined,
      rating: review.rating,
      date: review.created_at?.trim() || undefined,
      content: review.comment?.trim() || review.content?.trim() || undefined,
      verified: review.is_verified_purchase ?? undefined,
    })),
    ratingDistribution: [],
    questions: questions.map((question) => ({
      id: String(question.id),
      author: question.author?.trim() || undefined,
      question: question.question,
      date: question.date?.trim() || undefined,
      answers: Array.isArray(question.answers)
        ? question.answers.map((answer: ProductDetailQaAnswerSourceDto) => ({
            id: String(answer.id),
            author:
              answer.author?.trim().toLowerCase() === "hasaki"
                ? "Mizuki"
                : answer.author?.trim() || undefined,
            text: answer.text?.trim() || "",
            date: answer.date?.trim() || undefined,
          }))
        : [],
    })),
    branches: branchAvailability.map((branch) => {
      const availableQuantity = finiteNumber(branch.available_quantity) ?? 0;

      return {
        id: String(branch.branch_id),
        variantId:
          branch.variant_id === undefined ? undefined : String(branch.variant_id),
        name: branch.branch_name,
        address: "Xem địa chỉ tại bộ chọn chi nhánh.",
        availableQuantity,
        stockState: detailStockState(availableQuantity),
        stockLabel: detailStockLabel(availableQuantity),
      };
    }),
    relatedProductIds: relatedProducts.map((item) => String(item.id)),
  };
}

export interface ProductDetailQaAnswerSourceDto {
  readonly id: number | string;
  readonly author?: string | null;
  readonly text: string;
  readonly date?: string | null;
}

export interface ProductDetailQaSourceDto {
  readonly id: number | string;
  readonly author?: string | null;
  readonly question: string;
  readonly date?: string | null;
  readonly answers?: readonly ProductDetailQaAnswerSourceDto[] | null;
}

export interface ProductReviewDistributionItem {
  readonly rating: number;
  readonly count: number;
  readonly percentage: number;
}

export interface ProductReviewViewModel {
  readonly id: string;
  readonly author: string;
  readonly initials: string;
  readonly date: string;
  readonly rating: number;
  readonly verified: boolean;
  readonly content: string;
  readonly title: string;
  readonly images: readonly string[];
  readonly helpfulCount?: number;
  readonly mizukiResponse?: string;
}
export interface ProductVariantGroupOptionProduct {
  readonly externalId: string;
  readonly productId: string | null;
  readonly slug: string | null;
  readonly name: string | null;
  readonly price: number | null;
}

export interface ProductVariantGroupOption {
  readonly id: string;
  readonly label: string;
  readonly imageUrl?: string;
  readonly isDefault: boolean;
  readonly products: readonly ProductVariantGroupOptionProduct[];
}

export interface ProductVariantGroup {
  readonly id: string;
  readonly label: string;
  readonly displayType: "image" | "text";
  readonly selectedLabel: string | null;
  readonly options: readonly ProductVariantGroupOption[];
}
export interface ProductReviewPageViewModel {
  readonly summary: {
    readonly averageRating: number;
    readonly totalReviews: number;
    readonly satisfactionPercentage: number;
    readonly distribution: readonly ProductReviewDistributionItem[];
  };
  readonly reviews: readonly ProductReviewViewModel[];
  readonly pagination: {
    readonly currentPage: number;
    readonly perPage: number;
    readonly total: number;
    readonly lastPage: number;
  };
}

function reviewInitials(displayName: string): string {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return initials || "KH";
}

function normalizeReviewImages(
  images: readonly string[] | null | undefined,
): string[] {
  return (images ?? [])
    .map((image) => image.trim())
    .filter(Boolean)
    .map(resolveProductImage);
}

function reviewDistributionFromSummary(
  response: ProductReviewsResponseDto,
): ProductReviewDistributionItem[] {
  const distribution = response.data.summary.rating_distribution ?? {};
  const total = Math.max(0, response.data.summary.total_reviews ?? 0);

  return [5, 4, 3, 2, 1].map((rating) => {
    const count = Math.max(
      0,
      Number(
        distribution[String(rating)] ??
          distribution[`${rating}_star`] ??
          distribution[`${rating}_stars`] ??
          0,
      ) || 0,
    );

    return {
      rating,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

export function adaptProductReviews(
  response: ProductReviewsResponseDto,
): ProductReviewPageViewModel {
  const summary = response.data.summary;
  const distribution = reviewDistributionFromSummary(response);
  const totalReviews = Math.max(0, Number(summary.total_reviews) || 0);

  const explicitSatisfaction = finiteNumber(summary.satisfaction_percentage);
  const satisfiedCount = distribution
    .filter((item) => item.rating >= 4)
    .reduce((total, item) => total + item.count, 0);

  return {
    summary: {
      averageRating: finiteNumber(summary.average_rating) ?? 0,
      totalReviews,
      satisfactionPercentage:
        explicitSatisfaction !== null
          ? Math.round(explicitSatisfaction)
          : totalReviews > 0
            ? Math.round((satisfiedCount / totalReviews) * 100)
            : 0,
      distribution,
    },
    reviews: response.data.reviews.map((review) => {
      const author =
        review.customer?.display_name?.trim() || "Khách hàng Mizuki";
      const images = normalizeReviewImages(
        review.image_urls?.length ? review.image_urls : review.images,
      );
      const rating = finiteNumber(review.rating) ?? 0;
      const helpfulCount = finiteNumber(review.helpful_count);

      return {
        id: String(review.id),
        author,
        initials: reviewInitials(author),
        date: review.reviewed_at?.trim() || "",
        rating,
        verified: Boolean(review.verified_purchase),
        content: review.content?.trim() || "",
        title:
          review.title?.trim() ||
          (rating >= 5
            ? "Rất hài lòng"
            : rating >= 4
              ? "Trải nghiệm tốt"
              : rating >= 3
                ? "Sản phẩm ổn"
                : "Cần cải thiện"),
        images,
        helpfulCount: helpfulCount ?? undefined,
        mizukiResponse: review.mizuki_response?.content?.trim() || undefined,
      };
    }),
    pagination: {
      currentPage: response.meta.pagination.current_page,
      perPage: response.meta.pagination.per_page,
      total: response.meta.pagination.total,
      lastPage: response.meta.pagination.last_page,
    },
  };
}
