<script setup lang="ts">
import {
  BadgeCheck,
  ChevronRight,
  ChevronLeft,
  CircleHelp,
  Heart,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Send,
  Image,
  MessageSquare,
  ThumbsUp,
  ChevronDown,
  X,
} from "@lucide/vue";
import { computed, ref, watch, onBeforeUnmount, onMounted } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import BaseButton from "@/components/common/BaseButton.vue";
import { useToast } from "@/components/common/toast";
import ProductBranchAvailabilityCarousel from "@/components/products/ProductBranchAvailabilityCarousel.vue";
import ProductDetailGallery from "@/components/products/ProductDetailGallery.vue";
import ProductSuggestions from "@/components/products/ProductSuggestions.vue";
import { ROUTE_NAMES } from "@/constants/routes";
import { followBrand, unfollowBrand } from "@/api/productListingApi";
import CustomerLayout from "@/layouts/CustomerLayout.vue";
import { resolveTransportAsset } from "@/api/productListingAdapter";
import {
  useProductDetailQuery,
  useProductListingQuery,
  useProductReviewsQuery,
} from "@/queries/productListing";
import { pinia } from "@/stores/pinia";
import { useBranchPreferenceStore } from "@/stores/branchPreference";
import { useAddCartItemMutation, useCustomerCartQuery } from "@/queries/cart";
import { useAuthStore } from "@/stores/auth";
import type {
  ProductContentState,
  ProductDetailStockState,
} from "@/types/products";

type ProductDetailDemoState =
  | ProductContentState
  | "out-of-stock"
  | "low-stock"
  | "unavailable-variant";

interface SubmittedQuestion {
  readonly id: string;
  readonly question: string;
  readonly date: string;
  readonly author: string;
}
interface IngredientHighlight {
  readonly name: string;
  readonly description: string;
}

interface IngredientContent {
  readonly hasContent: boolean;
  readonly highlighted: readonly IngredientHighlight[];
  readonly full: string;
  readonly fallback: string;
}

type ReviewFilter = "all" | 5 | 4 | 3 | 2 | 1 | "images";
interface ReviewViewModel {
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

interface ReviewDistributionRow {
  readonly rating: number;
  readonly count: number;
  readonly percentage: number;
}

interface ProductReviewPageViewModel {
  readonly summary: {
    readonly averageRating: number;
    readonly totalReviews: number;
    readonly satisfactionPercentage: number;
    readonly distribution: readonly ReviewDistributionRow[];
  };
  readonly reviews: readonly ReviewViewModel[];
  readonly pagination: {
    readonly currentPage: number;
    readonly perPage: number;
    readonly total: number;
    readonly lastPage: number;
  };
}
const sectionLinks = [
  { id: "description", label: "Mô tả" },
  { id: "ingredients", label: "Thành phần" },
  { id: "usage", label: "Hướng dẫn sử dụng" },
  { id: "specifications", label: "Thông số" },
  { id: "reviews", label: "Đánh giá" },
  { id: "questions", label: "Hỏi đáp" },
  { id: "branches", label: "Chi nhánh còn hàng" },
] as const;

const ingredientContent = computed<IngredientContent>(() => {
  const raw = (product.value?.ingredients ?? [])
    .join("\n")
    .replace(/\r/g, "")
    .trim();

  if (!raw) {
    return {
      hasContent: false,
      highlighted: [],
      full: "",
      fallback: "",
    };
  }

  const mainMarker = /(?:Thành phần chính|Thành phần nổi bật)\s*:\s*/i;
  const fullMarker =
    /(?:Thành phần đầy đủ|Thành phần chi tiết|Bảng thành phần)\s*:\s*/i;

  const mainMatch = mainMarker.exec(raw);
  const fullMatch = fullMarker.exec(raw);

  let mainText = "";
  let fullText = "";

  if (mainMatch) {
    const mainStart = mainMatch.index + mainMatch[0].length;
    const mainEnd =
      fullMatch && fullMatch.index > mainMatch.index
        ? fullMatch.index
        : raw.length;

    mainText = raw.slice(mainStart, mainEnd).trim();
  }

  if (fullMatch) {
    const fullStart = fullMatch.index + fullMatch[0].length;
    fullText = raw.slice(fullStart).trim();
  }

  const highlighted = mainText
    ? mainText
        .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ỹ0-9][A-Za-zÀ-ỹ0-9™®()\s\-/.]{1,80}:)/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const separatorIndex = item.indexOf(":");

          if (separatorIndex <= 0) {
            return null;
          }

          const name = item.slice(0, separatorIndex).trim();
          const description = item.slice(separatorIndex + 1).trim();

          if (!name || !description) {
            return null;
          }

          return {
            name,
            description,
          };
        })
        .filter((item): item is IngredientHighlight => item !== null)
    : [];

  const fallback = !mainMatch && !fullMatch ? raw : "";

  return {
    hasContent: Boolean(highlighted.length || fullText || fallback),
    highlighted,
    full: fullText,
    fallback,
  };
});

const codBadgeUrl = resolveTransportAsset("cod.png");
const freeshipBadgeUrl = resolveTransportAsset("freeship2.png");
const route = useRoute();
const router = useRouter();
const branchStore = useBranchPreferenceStore(pinia);
const authStore = useAuthStore(pinia);
const { toast } = useToast();
const addCartMutation = useAddCartItemMutation(
  computed(() => authStore.user?.id ?? null),
);
const cartQuery = useCustomerCartQuery(
  computed(() => authStore.user?.id ?? null),
);
branchStore.restore();
const retryState = ref<ProductDetailDemoState | null>(null);
const quantity = ref(1);
const selectedVariants = ref<Record<string, string>>({});
const isFavorite = ref(false);
const isFollowingBrand = ref(false);
const isBrandFollowPending = ref(false);
const brandFollowerCount = ref<number | undefined>();
const brandFollowFeedback = ref("");
const purchaseFeedback = ref("");
const activeSection = ref<(typeof sectionLinks)[number]["id"]>(
  sectionLinks[0].id,
);
const questionDraft = ref("");
const questionError = ref("");
const questionFeedback = ref("");
const submittedQuestions = ref<SubmittedQuestion[]>([]);

// Hỏi đáp
const descriptionExpanded = ref(false);
const likedQuestionIds = ref<Set<string>>(new Set());
const questionLikeCounts = ref<Record<string, number>>({});
const replyingQuestionIds = ref<Set<string>>(new Set());
const replyDrafts = ref<Record<string, string>>({});
const questionDisplayLimit = ref(3);

const currentUserDisplayName = computed(
  () => authStore.user?.name?.trim() || authStore.user?.email || "Bạn",
);

function questionLikeCount(id: string): number {
  return questionLikeCounts.value[id] ?? 0;
}

function toggleQuestionLike(id: string): void {
  const nextLiked = new Set(likedQuestionIds.value);
  const nextCounts = { ...questionLikeCounts.value };

  if (nextLiked.has(id)) {
    nextLiked.delete(id);
    nextCounts[id] = Math.max(0, (nextCounts[id] ?? 0) - 1);
  } else {
    nextLiked.add(id);
    nextCounts[id] = (nextCounts[id] ?? 0) + 1;
  }

  likedQuestionIds.value = nextLiked;
  questionLikeCounts.value = nextCounts;
}

function toggleReplyForm(id: string): void {
  const next = new Set(replyingQuestionIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  replyingQuestionIds.value = next;
}

const allQuestionsCount = computed(
  () =>
    submittedQuestions.value.length + (product.value?.questions.length ?? 0),
);

const visibleSubmittedQuestions = computed(() =>
  submittedQuestions.value.slice(0, questionDisplayLimit.value),
);

const remainingLimitAfterSubmitted = computed(() =>
  Math.max(0, questionDisplayLimit.value - submittedQuestions.value.length),
);

const visibleProductQuestions = computed(
  () =>
    product.value?.questions.slice(0, remainingLimitAfterSubmitted.value) ?? [],
);

const canLoadMoreQuestions = computed(
  () => questionDisplayLimit.value < allQuestionsCount.value,
);

function loadMoreQuestions(): void {
  questionDisplayLimit.value = allQuestionsCount.value;
}

const brandLogoFailed = ref(false);
const ingredientsExpanded = ref(false);
const activeReviewFilter = ref<ReviewFilter>("all");
const reviewPerPage = ref(3);

let submittedQuestionCount = 0;

const slug = computed(() =>
  typeof route.params.slug === "string" ? route.params.slug : "",
);
const detailQuery = useProductDetailQuery(slug);
const product = computed(() => detailQuery.data.value);

const reviewFilters = computed(() => ({
  rating:
    typeof activeReviewFilter.value === "number"
      ? activeReviewFilter.value
      : null,
  hasImages: activeReviewFilter.value === "images",
  verifiedOnly: false,
  perPage: reviewPerPage.value,
}));

const reviewsQuery = useProductReviewsQuery(
  slug,
  reviewFilters,
  computed(() => Boolean(product.value)),
);

const reviewPage = computed(
  () => reviewsQuery.data.value as ProductReviewPageViewModel | undefined,
);

const reviewAverageRating = computed(
  () => reviewPage.value?.summary.averageRating ?? 0,
);

const reviewTotalCount = computed(
  () => reviewPage.value?.summary.totalReviews ?? 0,
);

const reviewDistribution = computed<readonly ReviewDistributionRow[]>(
  () =>
    reviewPage.value?.summary.distribution ?? [
      { rating: 5, count: 0, percentage: 0 },
      { rating: 4, count: 0, percentage: 0 },
      { rating: 3, count: 0, percentage: 0 },
      { rating: 2, count: 0, percentage: 0 },
      { rating: 1, count: 0, percentage: 0 },
    ],
);

const satisfactionPercentage = computed(
  () => reviewPage.value?.summary.satisfactionPercentage ?? 0,
);

const visibleReviews = computed<readonly ReviewViewModel[]>(
  () => reviewPage.value?.reviews ?? [],
);

const canLoadMoreReviews = computed(() => {
  const pagination = reviewPage.value?.pagination;
  return pagination ? pagination.currentPage < pagination.lastPage : false;
});
const descriptionIsLong = computed(() => {
  const paragraphs = product.value?.description ?? [];
  return paragraphs.length > 4 || paragraphs.join("\n").length > 700;
});

const requestedState = computed<ProductDetailDemoState>(() => {
  if (retryState.value) {
    return retryState.value;
  }

  const state =
    typeof route.query.state === "string" ? route.query.state : "success";
  const supportedStates: readonly ProductDetailDemoState[] = [
    "success",
    "loading",
    "empty",
    "error",
    "out-of-stock",
    "low-stock",
    "unavailable-variant",
  ];

  return supportedStates.includes(state as ProductDetailDemoState)
    ? (state as ProductDetailDemoState)
    : "success";
});

const contentState = computed<ProductContentState>(() => {
  if (requestedState.value === "loading") return "loading";
  if (requestedState.value === "error") return "error";
  if (detailQuery.isPending.value) return "loading";
  if (detailQuery.isError.value) return "error";
  if (!product.value || requestedState.value === "empty") return "empty";
  return "success";
});

const relatedRequest = computed(() => ({
  ...(branchStore.selectedBranchId
    ? { branch_id: branchStore.selectedBranchId }
    : {}),
  sort: "rating" as const,
  page: 1,
  per_page: 8,
}));

const relatedQuery = useProductListingQuery(
  relatedRequest,
  computed(() => Boolean(product.value)),
);

const relatedProducts = computed(
  () =>
    relatedQuery.data.value?.products.filter(
      (item) => item.slug !== slug.value,
    ) ?? [],
);

const brandPageTarget = computed(() => {
  const brandSlug = product.value?.brand.slug;
  return brandSlug ? `/brand/${brandSlug}` : undefined;
});

const selectedUnavailable = computed(() => {
  if (requestedState.value === "unavailable-variant") {
    return true;
  }

  return (
    product.value?.variants.some((group) => {
      const selectedId = selectedVariants.value[group.id];
      return group.options.some(
        (option) => option.id === selectedId && !option.available,
      );
    }) ?? false
  );
});

const selectedVariantId = computed(() => {
  const id = Number(selectedVariants.value.variant);
  return Number.isInteger(id) && id > 0 ? id : null;
});

const quantityAlreadyInCart = computed(() => {
  const cart = cartQuery.data.value;

  if (
    !cart ||
    !cart.branch ||
    Number(cart.branch.id) !== Number(branchStore.selectedBranchId) ||
    selectedVariantId.value === null
  ) {
    return 0;
  }

  return (
    cart.items.find((item) => item.variant.id === selectedVariantId.value)
      ?.quantity ?? 0
  );
});

const selectedBranchAvailableQuantity = computed(() => {
  if (selectedVariantId.value === null) return 0;

  return (
    product.value?.branches.find(
      (branch) =>
        branch.id === String(branchStore.selectedBranchId) &&
        branch.variantId === String(selectedVariantId.value),
    )?.availableQuantity ?? 0
  );
});

const remainingQuantity = computed(() =>
  Math.max(
    0,
    selectedBranchAvailableQuantity.value - quantityAlreadyInCart.value,
  ),
);

const purchaseStock = computed<{
  state: ProductDetailStockState;
  label: string;
}>(() => {
  if (requestedState.value === "out-of-stock") {
    return { state: "out-of-stock", label: "Tạm hết hàng" };
  }

  if (requestedState.value === "low-stock") {
    return { state: "low-stock", label: "Chỉ còn ít sản phẩm" };
  }

  if (selectedUnavailable.value) {
    return { state: "out-of-stock", label: "Phân loại này tạm hết hàng" };
  }

  if (remainingQuantity.value === 0) {
    return {
      state: "out-of-stock",
      label: "Bạn đã chọn hết số lượng hiện có vào giỏ hàng",
    };
  }

  if (quantityAlreadyInCart.value > 0) {
    return {
      state: remainingQuantity.value <= 5 ? "low-stock" : "available",
      label: `Bạn có thể thêm tối đa ${remainingQuantity.value} sản phẩm nữa`,
    };
  }
  if (selectedBranchAvailableQuantity.value > 0) {
    return {
      state:
        selectedBranchAvailableQuantity.value <= 5 ? "low-stock" : "available",
      label:
        selectedBranchAvailableQuantity.value <= 5
          ? "Sắp hết hàng"
          : "Còn hàng",
    };
  }
  return {
    state: product.value?.stockState ?? "out-of-stock",
    label: product.value?.stockLabel ?? "Tạm hết hàng",
  };
});

const purchaseDisabled = computed(
  () => purchaseStock.value.state === "out-of-stock",
);

const formattedDescription = computed(() => {
  const content = (product.value?.description ?? [])
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!content) return [];

  const sentences =
    content
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      ?.map((sentence) => sentence.trim()) ?? [];

  const paragraphs: string[] = [];

  for (let index = 0; index < sentences.length; index += 3) {
    paragraphs.push(sentences.slice(index, index + 3).join(" "));
  }

  return paragraphs;
});

const usageSections = computed(() => {
  const content = (product.value?.usage ?? [])
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!content) {
    return {
      directions: "",
      warnings: "",
    };
  }

  const warningIndex = content.search(/Lưu ý\s*:/i);

  if (warningIndex === -1) {
    return {
      directions: content.replace(/^Cách dùng\s*:\s*/i, ""),
      warnings: "",
    };
  }

  return {
    directions: content
      .slice(0, warningIndex)
      .replace(/^Cách dùng\s*:\s*/i, "")
      .trim(),
    warnings: content
      .slice(warningIndex)
      .replace(/^Lưu ý\s*:\s*/i, "")
      .trim(),
  };
});

const visibleSpecifications = computed(() =>
  (product.value?.specifications ?? [])
    .map((item) => ({
      label: String(item.label ?? "").trim(),
      value: String(item.value ?? "").trim(),
    }))
    .filter((item) => item.label !== "" && item.value !== ""),
);
const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

const lightboxOpen = ref(false);
const lightboxImages = ref<readonly string[]>([]);
const lightboxIndex = ref(0);

function setReviewFilter(filter: ReviewFilter): void {
  activeReviewFilter.value = filter;
  reviewPerPage.value = 3;
}

function initializeSelections(): void {
  const initialSelections: Record<string, string> = {};

  product.value?.variants.forEach((group) => {
    initialSelections[group.id] =
      group.options.find((option) => option.selected)?.id ??
      group.options.find((option) => option.available)?.id ??
      group.options[0]?.id ??
      "";
  });

  selectedVariants.value = initialSelections;
  quantity.value = 1;
  purchaseFeedback.value = "";
}

watch(
  () => product.value?.id,
  () => {
    initializeSelections();
    descriptionExpanded.value = false;
    brandLogoFailed.value = false;
    isFollowingBrand.value = product.value?.brand.isFollowing ?? false;
    isBrandFollowPending.value = false;
    brandFollowerCount.value = product.value?.brand.followerCount;
    brandFollowFeedback.value = "";
    ingredientsExpanded.value = false;
    activeReviewFilter.value = "all";
    reviewPerPage.value = 3;
    questionDisplayLimit.value = 3;
  },
  { immediate: true },
);

async function toggleBrandFollow(): Promise<void> {
  const brandId = product.value?.brand.id;
  if (!brandId || isBrandFollowPending.value) return;

  if (!authStore.isAuthenticated || authStore.role !== "customer") {
    brandFollowFeedback.value =
      "Bạn cần đăng nhập bằng tài khoản khách hàng để theo dõi thương hiệu.";
    if (!authStore.isAuthenticated) {
      await router.push({
        name: ROUTE_NAMES.login,
        query: { redirect: route.fullPath },
      });
    }
    return;
  }

  const nextFollowingState = !isFollowingBrand.value;
  const previousFollowerCount = brandFollowerCount.value;
  isBrandFollowPending.value = true;
  brandFollowFeedback.value = "";

  try {
    const result = nextFollowingState
      ? await followBrand(brandId)
      : await unfollowBrand(brandId);
    brandFollowerCount.value = result.follower_count;
    isFollowingBrand.value = nextFollowingState;
  } catch (error: unknown) {
    brandFollowerCount.value = previousFollowerCount;
    brandFollowFeedback.value =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : "Không thể cập nhật trạng thái theo dõi. Vui lòng thử lại.";
  } finally {
    isBrandFollowPending.value = false;
  }
}

function setQuantity(nextQuantity: number): void {
  const maximum = Math.max(remainingQuantity.value, 1);
  quantity.value = Math.min(Math.max(nextQuantity, 1), maximum);
}

function chooseVariant(groupId: string, optionId: string): void {
  const group = product.value?.variants.find((item) => item.id === groupId);

  const option = group?.options.find((item) => item.id === optionId);

  if (!option?.available) {
    return;
  }

  selectedVariants.value = {
    ...selectedVariants.value,
    [groupId]: optionId,
  };

  purchaseFeedback.value = "";
}

function purchaseErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "validationErrors" in error
  ) {
    const validationErrors = error.validationErrors;

    if (typeof validationErrors === "object" && validationErrors !== null) {
      for (const messages of Object.values(validationErrors)) {
        if (!Array.isArray(messages)) continue;
        const message = messages.find(
          (candidate): candidate is string =>
            typeof candidate === "string" && candidate.trim().length > 0,
        );
        if (message) return message;
      }
    }
  }

  return typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : "Không thể thêm sản phẩm vào giỏ hàng.";
}

async function submitPurchase(action: "cart" | "buy"): Promise<void> {
  if (purchaseDisabled.value) return;

  if (action === "cart") {
    const variantId = Number(selectedVariants.value.variant);
    if (!Number.isInteger(variantId) || variantId <= 0) return;
    if (!authStore.isAuthenticated || authStore.role !== "customer") {
      await router.push({
        name: ROUTE_NAMES.login,
        query: { redirect: route.fullPath },
      });
      return;
    }
    try {
      await addCartMutation.mutateAsync({
        productVariantId: variantId,
        quantity: quantity.value,
      });
      purchaseFeedback.value = "";
      toast({ title: "Đã thêm sản phẩm vào giỏ hàng.", variant: "success" });
    } catch (error: unknown) {
      purchaseFeedback.value = purchaseErrorMessage(error);
    }
    return;
  }

  purchaseFeedback.value = "Đã chuẩn bị sản phẩm cho bước mua ngay.";
}

function submitQuestion(): void {
  const question = questionDraft.value.trim();

  if (question.length < 10) {
    questionError.value =
      "Câu hỏi cần có ít nhất 10 ký tự để Mizuki hiểu rõ hơn.";
    questionFeedback.value = "";
    return;
  }

  submittedQuestionCount += 1;
  submittedQuestions.value = [
    {
      id: `submitted-question-${submittedQuestionCount}`,
      question,
      author: currentUserDisplayName.value,
      date: new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    },
    ...submittedQuestions.value,
  ];

  questionDraft.value = "";
  questionError.value = "";
  questionFeedback.value = "Câu hỏi đã được ghi nhận và đang chờ tư vấn.";
}

function clearQuestionFeedback(): void {
  questionError.value = "";
  questionFeedback.value = "";
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function scrollToSection(sectionId: (typeof sectionLinks)[number]["id"]): void {
  activeSection.value = sectionId;
  const target =
    typeof document === "undefined" ? null : document.getElementById(sectionId);

  if (typeof target?.scrollIntoView === "function") {
    target.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  }
}

function retry(): void {
  retryState.value = "success";
  void detailQuery.refetch();
  void router.replace({
    query: {
      ...route.query,
      state: undefined,
    },
  });
}

function openLightbox(images: readonly string[], index: number): void {
  lightboxImages.value = images;
  lightboxIndex.value = index;
  lightboxOpen.value = true;
}

function closeLightbox(): void {
  lightboxOpen.value = false;
}

function showPreviousImage(): void {
  lightboxIndex.value =
    (lightboxIndex.value - 1 + lightboxImages.value.length) %
    lightboxImages.value.length;
}

function showNextImage(): void {
  lightboxIndex.value = (lightboxIndex.value + 1) % lightboxImages.value.length;
}

const stickyNavOffset = ref(0);
const scrollMarginOffset = ref(160);

function updateStickyNavOffset(): void {
  if (typeof document === "undefined") return;
  const header = document.querySelector<HTMLElement>(
    "header[aria-label='Đầu trang khách hàng']",
  );
  const nav = document.querySelector<HTMLElement>("[data-detail-section-nav]");
  stickyNavOffset.value = header?.offsetHeight ?? 0;
  scrollMarginOffset.value =
    (header?.offsetHeight ?? 0) + (nav?.offsetHeight ?? 0) + 65;
}

onMounted(() => {
  updateStickyNavOffset();
  window.addEventListener("resize", updateStickyNavOffset);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateStickyNavOffset);
});
</script>

<template>
  <CustomerLayout>
    <div
      class="bg-[#f7faf8]"
      data-product-detail-page
      :data-content-state="contentState"
    >
      <div class="mx-auto w-full max-w-360 px-4 py-2 sm:px-6 lg:px-8">
        <RouterLink
          :to="{ name: ROUTE_NAMES.products }"
          class="motion-interactive inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-body-sm font-medium text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ChevronLeft class="size-4" aria-hidden="true" />
          Trở lại danh sách sản phẩm
        </RouterLink>
      </div>

      <div
        v-if="contentState === 'loading'"
        class="mx-auto grid min-h-136 w-full max-w-360 gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-2 lg:px-8"
        role="status"
        aria-live="polite"
        data-detail-loading
      >
        <span class="sr-only">Đang tải thông tin sản phẩm</span>
        <div class="aspect-square animate-pulse rounded-4xl bg-primary-100" />
        <div class="space-y-4 pt-6">
          <div class="h-5 w-28 animate-pulse rounded-full bg-primary-100" />
          <div class="h-10 w-4/5 animate-pulse rounded-xl bg-primary-100" />
          <div class="h-8 w-44 animate-pulse rounded-xl bg-primary-100" />
          <div class="h-32 animate-pulse rounded-2xl bg-primary-100" />
        </div>
      </div>

      <section
        v-else-if="contentState === 'empty'"
        class="mx-auto grid min-h-136 w-full max-w-2xl place-items-center px-4 pb-12 text-center"
        data-detail-empty
      >
        <div>
          <ShoppingBag
            class="mx-auto size-12 text-primary-500"
            aria-hidden="true"
          />
          <h1 class="mt-5 text-heading-2 text-primary-950">
            Không tìm thấy sản phẩm
          </h1>
          <p class="mt-2 text-body-md text-text-secondary">
            Sản phẩm có thể đã thay đổi hoặc không còn trong danh mục hiện tại.
          </p>
          <RouterLink
            :to="{ name: ROUTE_NAMES.products }"
            class="motion-interactive mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Xem danh sách sản phẩm
          </RouterLink>
        </div>
      </section>

      <section
        v-else-if="contentState === 'error'"
        class="mx-auto grid min-h-136 w-full max-w-2xl place-items-center px-4 pb-12 text-center"
        data-detail-error
      >
        <div>
          <CircleHelp
            class="mx-auto size-12 text-primary-600"
            aria-hidden="true"
          />
          <h1 class="mt-5 text-heading-2 text-primary-950">
            Chưa thể hiển thị sản phẩm
          </h1>
          <p class="mt-2 text-body-md text-text-secondary">
            Dữ liệu sản phẩm đang gián đoạn. Bạn có thể thử hiển thị lại ngay.
          </p>
          <BaseButton class="mt-6" @click="retry">Thử lại</BaseButton>
        </div>
        <pre
          class="mt-4 max-w-full whitespace-pre-wrap break-all text-xs text-red-700"
        >
  {{
            detailQuery.error.value instanceof Error
              ? detailQuery.error.value.stack
              : String(detailQuery.error.value)
          }}
</pre
        >
      </section>

      <template v-else-if="product">
        <div
          class="mx-auto grid w-full max-w-360 items-start gap-0 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:px-8"
          data-product-hero
        >
          <ProductDetailGallery :images="product.images" />

          <section
            class="min-w-0 rounded-4xl border border-primary-100 bg-white p-5 px-10! shadow-xs sm:p-6"
            aria-labelledby="product-detail-title"
            data-product-info
          >
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-for="badge in product.badges"
                :key="badge"
                class="rounded-full bg-primary-50 px-3 py-1 text-caption font-semibold text-primary-800"
              >
                {{ badge }}
              </span>
            </div>

            <div class="mt-2 flex items-center gap-2">
              <BadgeCheck
                class="size-8 fill-blue-500 text-white"
                aria-hidden="true"
              />
              <p
                class="mt-1 text-body-sm font-semibold uppercase tracking-[0.12em] text-primary-700"
              >
                {{ product.brand.name }}
              </p>
            </div>

            <h1
              id="product-detail-title"
              class="mt-1.5 text-heading-2 leading-tight text-primary-950"
            >
              {{ product.name }}
            </h1>

            <div
              class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-body-sm text-text-secondary"
            >
              <span
                class="inline-flex items-center gap-1.5 font-semibold text-primary-900"
              >
                {{ product.rating.toFixed(1) }}
                <span
                  class="flex text-[#e3aa32]"
                  :aria-label="`${product.rating.toFixed(1)} trên 5 sao`"
                >
                  <Star
                    v-for="star in 5"
                    :key="star"
                    :class="[
                      'size-4',
                      star <= Math.round(product.rating)
                        ? 'fill-current'
                        : 'opacity-25',
                    ]"
                    aria-hidden="true"
                  />
                </span>
              </span>
              <a
                href="#reviews"
                class="underline decoration-primary-300 underline-offset-4"
                @click.prevent="scrollToSection('reviews')"
                >{{ product.reviewCount }} đánh giá</a
              >

              <template v-if="product.questions.length > 0">
                <span class="mx-1 text-text-muted">|</span>
                <a
                  href="#questions"
                  class="underline decoration-primary-300 underline-offset-4"
                  data-qa-count
                  @click.prevent="scrollToSection('questions')"
                  >{{ product.questions.length }} hỏi đáp</a
                >
              </template>
            </div>

            <div
              class="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2 rounded-2xl bg-[#f4f8f6] px-5 py-3.5"
            >
              <strong
                class="text-[clamp(1.65rem,4vw,2.25rem)] font-semibold tracking-tight text-[#bd3f38]"
              >
                {{ currencyFormatter.format(product.currentPrice) }}
              </strong>
              <span
                v-if="product.discountLabel"
                class="rounded-lg bg-[#fce8e6] px-2 py-1 text-caption font-bold text-[#a52f29]"
              >
                {{ product.discountLabel }}
              </span>
              <span
                v-if="
                  product.originalPrice &&
                  product.originalPrice > product.currentPrice
                "
                class="text-body-sm text-text-muted line-through"
              >
                {{ currencyFormatter.format(product.originalPrice) }}
              </span>

              <span class="text-text-muted"> (Đã bao gồm VAT) </span>
            </div>

            <div
              class="mt-4 space-y-2.5 rounded-2xl border border-primary-100 bg-[#f7faf8] p-4"
              data-shipping-promo
            >
              <div class="flex items-start gap-3" data-shipping-summary>
                <img
                  :src="codBadgeUrl"
                  alt="Hỗ trợ thanh toán COD"
                  class="h-8 w-auto shrink-0"
                  loading="lazy"
                />
                <div class="min-w-0">
                  <p class="text-body-sm text-emerald-700">
                    Nhận hàng từ 2 - 4 ngày
                  </p>
                  <p class="mt-0.5 text-body-sm font-bold text-[#b7791f]">
                    Tặng Voucher 15.000₫ nếu đơn hàng giao sau thời gian trên.
                  </p>
                </div>
              </div>
              <div
                class="flex flex-wrap items-center gap-3 border-t border-primary-100 pt-2.5"
                data-payment-badges
              >
                <img
                  :src="freeshipBadgeUrl"
                  alt="Freeship"
                  class="h-8 w-auto shrink-0"
                  loading="lazy"
                />
                <p class="text-body-sm text-emerald-700">
                  Freeship 10k đơn từ 45k, Freeship 25k đơn từ 100k
                </p>
              </div>
            </div>

            <fieldset
              v-for="group in product.variants"
              :key="group.id"
              class="mt-4"
              :data-variant-group="group.id"
            >
              <legend class="text-body-sm font-semibold text-primary-950">
                {{ group.label }}
              </legend>
              <div class="mt-2 flex flex-wrap gap-2">
                <label
                  v-for="option in group.options"
                  :key="option.id"
                  class="relative"
                >
                  <input
                    type="radio"
                    class="peer sr-only"
                    :name="group.id"
                    :value="option.id"
                    :checked="selectedVariants[group.id] === option.id"
                    :disabled="!option.available"
                    :aria-describedby="
                      !option.available
                        ? `${group.id}-${option.id}-status`
                        : undefined
                    "
                    @change="chooseVariant(group.id, option.id)"
                  />
                  <span
                    class="motion-interactive inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-primary-200 bg-white px-4 text-body-sm font-medium text-primary-950 peer-checked:border-primary-800 peer-checked:bg-primary-50 peer-checked:ring-1 peer-checked:ring-primary-700 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                  >
                    {{ option.label }}
                    <span
                      v-if="!option.available"
                      class="ml-2 text-caption text-text-muted"
                      >Hết</span
                    >
                  </span>
                  <span
                    v-if="!option.available"
                    :id="`${group.id}-${option.id}-status`"
                    class="sr-only"
                  >
                    Phân loại hiện không có sẵn
                  </span>
                </label>
              </div>
            </fieldset>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div
                class="flex min-h-11 items-center gap-3"
                data-quantity-control
              >
                <label
                  class="text-body-sm font-semibold text-primary-950"
                  for="product-quantity"
                  >Số lượng</label
                >
                <div
                  class="inline-flex h-11 items-center overflow-hidden rounded-xl border border-primary-200 bg-white shadow-xs"
                >
                  <button
                    type="button"
                    class="grid size-11 shrink-0 place-items-center text-primary-900 hover:bg-primary-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
                    aria-label="Giảm số lượng"
                    :disabled="quantity <= 1"
                    @click="setQuantity(quantity - 1)"
                  >
                    <Minus class="size-4" aria-hidden="true" />
                  </button>
                  <output
                    id="product-quantity"
                    class="grid h-full min-w-12 place-items-center border-x border-primary-100 px-2 text-center text-body-sm font-semibold tabular-nums text-primary-950"
                    aria-label="Số lượng sản phẩm"
                  >
                    {{ quantity }}
                  </output>
                  <button
                    type="button"
                    class="grid size-11 shrink-0 place-items-center text-primary-900 hover:bg-primary-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
                    aria-label="Tăng số lượng"
                    :disabled="quantity >= remainingQuantity"
                    @click="setQuantity(quantity + 1)"
                  >
                    <Plus class="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <p
                class="inline-flex min-h-8 items-center gap-2 rounded-full px-3 py-1 text-body-sm font-semibold"
                :class="
                  purchaseStock.state === 'out-of-stock'
                    ? 'bg-[#fce8e6] text-[#9c302a]'
                    : purchaseStock.state === 'low-stock'
                      ? 'bg-[#fff2d6] text-[#805914]'
                      : 'bg-primary-50 text-primary-800'
                "
                :data-stock-state="purchaseStock.state"
                role="status"
              >
                <PackageCheck class="size-4" aria-hidden="true" />
                {{ purchaseStock.label }}
              </p>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <BaseButton
                variant="outline"
                size="lg"
                :disabled="purchaseDisabled"
                @click="submitPurchase('cart')"
              >
                <template #icon><ShoppingCart class="size-5" /></template>
                Thêm vào giỏ
              </BaseButton>
              <BaseButton
                size="lg"
                class="text-white!"
                :disabled="purchaseDisabled"
                @click="submitPurchase('buy')"
              >
                Mua ngay
              </BaseButton>
              <BaseButton
                variant="outline"
                size="icon"
                :class="
                  isFavorite
                    ? 'border-[#e5b3b0] bg-[#fff4f3] text-[#c43d38] hover:bg-[#fee9e7]'
                    : 'text-primary-900'
                "
                :aria-label="
                  isFavorite ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'
                "
                :aria-pressed="isFavorite"
                @click="isFavorite = !isFavorite"
              >
                <Heart
                  :class="[
                    'size-5',
                    isFavorite && 'fill-current text-[#c43d38]',
                  ]"
                  aria-hidden="true"
                />
              </BaseButton>
            </div>
            <p
              v-if="purchaseFeedback"
              class="mt-3 text-body-sm font-medium text-primary-800"
              role="status"
            >
              {{ purchaseFeedback }}
            </p>
          </section>
        </div>

        <section
          class="mx-auto w-full max-w-360 px-4 pb-8 sm:px-6 lg:px-8"
          aria-labelledby="brand-heading"
          data-brand-summary
        >
          <div
            class="rounded-4xl border border-primary-100 bg-[#eaf3ee] p-5 sm:p-6"
          >
            <div
              class="flex min-w-0 flex-col items-stretch gap-5 md:flex-row md:flex-wrap md:items-center md:justify-start md:gap-x-8 md:gap-y-5 xl:flex-nowrap xl:gap-9"
              data-brand-summary-bar
            >
              <div
                class="flex min-w-0 flex-none items-center gap-4"
                data-brand-group="identity"
              >
                <!-- <div
                  class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-heading-3 font-semibold text-primary-900 shadow-xs"
                >
                  <img
                    v-if="product.brand.logoUrl && !brandLogoFailed"
                    :src="product.brand.logoUrl"
                    :alt="`Logo ${product.brand.name}`"
                    class="h-auto w-auto max-h-full max-w-full object-contain p-2"
                    width="64"
                    height="64"
                    data-brand-logo
                    @error="brandLogoFailed = true"
                  />
                  <span v-else aria-hidden="true" data-brand-wordmark>{{
                    product.brand.initials
                  }}</span>
                </div> -->

                <div
                  class="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/80 bg-white shadow-xs"
                >
                  <img
                    v-if="product.brand.logoUrl && !brandLogoFailed"
                    :src="product.brand.logoUrl"
                    :alt="`Logo thương hiệu ${product.brand.name}`"
                    class="size-full object-contain p-2.5"
                    width="80"
                    height="80"
                    data-brand-logo
                    @error="brandLogoFailed = true"
                  />

                  <span
                    v-else
                    class="text-heading-3 font-bold text-primary-900"
                    aria-hidden="true"
                    data-brand-wordmark
                  >
                    {{ product.brand.initials }}
                  </span>
                </div>

                <div class="min-w-0">
                  <p
                    class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700"
                  >
                    THƯƠNG HIỆU
                  </p>
                  <h2
                    id="brand-heading"
                    class="mt-1 text-heading-3 text-primary-950"
                  >
                    {{ product.brand.name }}
                  </h2>
                  <div class="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      class="inline-flex items-center gap-1.5 text-body-sm font-semibold text-[#1769aa]"
                    >
                      <BadgeCheck
                        class="size-5 fill-blue-500 text-white"
                        aria-hidden="true"
                      />
                      Hàng chính hãng
                    </span>
                  </div>
                </div>
              </div>

              <dl
                v-if="
                  product.brand.productCount !== undefined ||
                  product.brand.rating !== undefined ||
                  product.brand.reviewCount !== undefined ||
                  brandFollowerCount !== undefined
                "
                class="grid flex-1 grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4"
                data-brand-metrics
              >
                <div v-if="product.brand.productCount !== undefined">
                  <dt class="text-caption text-text-muted">Đang bày bán</dt>
                  <dd
                    class="mt-1 font-semibold text-primary-950"
                    data-brand-active-product-count
                  >
                    {{ product.brand.productCount }} sản phẩm
                  </dd>
                </div>
                <div v-if="product.brand.rating !== undefined">
                  <dt class="text-caption text-text-muted">
                    Đánh giá thương hiệu
                  </dt>
                  <dd
                    class="mt-1 font-semibold text-primary-950"
                    data-brand-average-rating
                  >
                    {{ product.brand.rating.toFixed(1) }}
                  </dd>
                </div>
                <div v-if="product.brand.reviewCount !== undefined">
                  <dt class="text-caption text-text-muted">Lượt đánh giá</dt>
                  <dd
                    class="mt-1 font-semibold text-primary-950"
                    data-brand-review-count
                  >
                    {{ product.brand.reviewCount }}
                  </dd>
                </div>
                <div v-if="brandFollowerCount !== undefined">
                  <dt class="text-caption text-text-muted">Lượt theo dõi</dt>
                  <dd
                    class="mt-1 font-semibold text-primary-950"
                    data-brand-follower-count
                  >
                    {{ brandFollowerCount }}
                  </dd>
                </div>
              </dl>

              <div
                class="flex w-full max-w-44 flex-none flex-col items-stretch gap-2 md:self-center"
                data-brand-group="actions"
              >
                <RouterLink
                  v-if="brandPageTarget"
                  :to="brandPageTarget"
                  class="motion-interactive inline-flex min-h-9 items-center justify-center rounded-md bg-primary px-4 text-body-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  data-brand-products-link
                >
                  Xem thương hiệu
                </RouterLink>
                <BaseButton
                  variant="outline"
                  size="sm"
                  class="w-full"
                  :aria-pressed="isFollowingBrand"
                  :disabled="isBrandFollowPending || !product.brand.id"
                  data-brand-follow-button
                  @click="toggleBrandFollow"
                >
                  {{ isFollowingBrand ? "Đã theo dõi" : "Theo dõi" }}
                </BaseButton>
                <p
                  v-if="brandFollowFeedback"
                  class="text-caption text-[#a5322d]"
                  role="alert"
                  data-brand-follow-feedback
                >
                  {{ brandFollowFeedback }}
                </p>
              </div>
            </div>
          </div>
        </section>

        <nav
          class="sticky z-20 border-y border-primary-100 bg-white/95 shadow-xs backdrop-blur"
          :style="{ top: `${stickyNavOffset}px` }"
          aria-label="Nội dung sản phẩm"
          data-detail-section-nav
        >
          <div
            class="mx-auto flex w-full max-w-360 gap-1 overflow-x-auto px-4 py-2 scrollbar-none sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden"
          >
            <a
              v-for="section in sectionLinks"
              :key="section.id"
              :href="`#${section.id}`"
              :aria-controls="section.id"
              :aria-current="
                activeSection === section.id ? 'location' : undefined
              "
              class="motion-interactive min-h-10 shrink-0 rounded-full px-4 py-2 text-body-sm font-medium text-primary-800 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=location]:bg-primary aria-[current=location]:text-primary-foreground"
              @click.prevent="scrollToSection(section.id)"
              @keydown.enter.prevent="scrollToSection(section.id)"
            >
              {{ section.label }}
            </a>
          </div>
        </nav>

        <div
          class="mx-auto w-full max-w-360 space-y-6 px-4 py-8 sm:px-6 lg:px-8"
        >
          <section
            id="description"
            class="rounded-4xl border border-primary-100 bg-white p-6 sm:p-8"
            :style="{ scrollMarginTop: `${scrollMarginOffset}px` }"
            aria-labelledby="description-heading"
            data-detail-scroll-section
          >
            <p
              class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700"
            >
              Khám phá sản phẩm
            </p>
            <h2
              id="description-heading"
              class="mt-2 text-heading-2 text-primary-950"
            >
              Mô tả
            </h2>
            <div
              class="relative mt-5 max-w-3xl space-y-5 text-body-md leading-7 text-text-secondary"
              :class="
                descriptionIsLong && !descriptionExpanded
                  ? 'max-h-80 overflow-hidden'
                  : ''
              "
              data-description-content
            >
              <p
                v-for="(paragraph, index) in formattedDescription"
                :key="`${index}-${paragraph.slice(0, 30)}`"
                class="text-pretty"
              >
                <strong
                  v-if="index === 0"
                  class="font-semibold text-primary-950"
                >
                  {{ paragraph }}
                </strong>

                <template v-else>
                  {{ paragraph }}
                </template>
              </p>

              <div
                v-if="descriptionIsLong && !descriptionExpanded"
                class="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-white via-white/80 to-transparent"
                aria-hidden="true"
              />
            </div>
            <button
              v-if="descriptionIsLong"
              type="button"
              class="motion-interactive mt-6 inline-flex min-h-10 items-center rounded-xl bg-primary-50 px-4 text-body-sm font-semibold text-primary-800 hover:bg-primary-100"
              :aria-expanded="descriptionExpanded"
              @click="descriptionExpanded = !descriptionExpanded"
            >
              {{ descriptionExpanded ? "Thu gọn" : "Xem thêm" }}
            </button>
          </section>

          <section
            v-if="ingredientContent.hasContent"
            id="ingredients"
            class="rounded-4xl border border-primary-100 bg-white p-6 sm:p-8"
            :style="{ scrollMarginTop: `${scrollMarginOffset}px` }"
            aria-labelledby="ingredients-heading"
            data-detail-scroll-section
          >
            <p
              class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700"
            >
              Công thức sản phẩm
            </p>

            <h2
              id="ingredients-heading"
              class="mt-2 text-heading-2 text-primary-950"
            >
              Thành phần sản phẩm
            </h2>

            <div v-if="ingredientContent.highlighted.length" class="mt-6">
              <h3 class="text-body-md font-bold text-primary-950">
                Thành phần chính:
              </h3>

              <ul class="mt-4 space-y-3 pl-5">
                <li
                  v-for="item in ingredientContent.highlighted"
                  :key="item.name"
                  class="list-disc pl-1 text-body-sm leading-7 text-text-secondary"
                >
                  <strong class="font-bold text-primary-950">
                    {{ item.name }}:
                  </strong>
                  {{ item.description }}
                </li>
              </ul>
            </div>

            <div v-if="ingredientContent.full" class="mt-6">
              <h3 class="text-body-md font-bold text-primary-950">
                Thành phần đầy đủ:
              </h3>

              <p
                class="mt-3 max-w-5xl whitespace-pre-line text-body-sm leading-7 text-text-secondary"
              >
                {{ ingredientContent.full }}
              </p>
            </div>

            <p
              v-if="ingredientContent.fallback"
              class="mt-6 max-w-5xl whitespace-pre-line text-body-sm leading-7 text-text-secondary"
            >
              {{ ingredientContent.fallback }}
            </p>
          </section>

          <section
            id="usage"
            class="rounded-4xl border border-primary-100 bg-white p-6 sm:p-8"
            :style="{ scrollMarginTop: `${scrollMarginOffset}px` }"
            aria-labelledby="usage-heading"
            data-detail-scroll-section
          >
            <p
              class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700"
            >
              Cách sử dụng sản phẩm
            </p>

            <h2 id="usage-heading" class="mt-2 text-heading-2 text-primary-950">
              Hướng dẫn sử dụng
            </h2>

            <div
              v-if="usageSections.directions || usageSections.warnings"
              class="mt-6 overflow-hidden rounded-2xl border border-primary-100"
            >
              <div
                v-if="usageSections.directions"
                class="grid gap-4 bg-[#f8fbf9] p-5 sm:grid-cols-[10rem_1fr] sm:p-6"
              >
                <div>
                  <span
                    class="inline-flex rounded-full bg-primary-100 px-3 py-1 text-caption font-semibold text-primary-800"
                  >
                    Cách dùng
                  </span>
                </div>

                <p class="text-body-md leading-7 text-text-secondary">
                  {{ usageSections.directions }}
                </p>
              </div>

              <div
                v-if="usageSections.warnings"
                class="grid gap-4 border-t border-primary-100 bg-[#fffaf0] p-5 sm:grid-cols-[10rem_1fr] sm:p-6"
              >
                <div>
                  <span
                    class="inline-flex rounded-full bg-amber-100 px-3 py-1 text-caption font-semibold text-amber-800"
                  >
                    Lưu ý
                  </span>
                </div>

                <p class="text-body-md leading-7 text-[#66512d]">
                  {{ usageSections.warnings }}
                </p>
              </div>
            </div>

            <p
              v-else
              class="mt-5 rounded-2xl bg-[#f7faf8] p-5 text-body-sm text-text-secondary"
            >
              Chưa có hướng dẫn sử dụng cho sản phẩm này.
            </p>
          </section>

          <section
            v-if="visibleSpecifications.length > 0"
            id="specifications"
            class="rounded-4xl border border-primary-100 bg-white p-6 sm:p-8"
            :style="{ scrollMarginTop: `${scrollMarginOffset}px` }"
            aria-labelledby="specifications-heading"
            data-detail-scroll-section
          >
            <p
              class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700"
            >
              Thông tin chi tiết
            </p>

            <h2
              id="specifications-heading"
              class="mt-2 text-heading-2 text-primary-950"
            >
              Thông số sản phẩm
            </h2>

            <dl
              class="mt-6 overflow-hidden rounded-2xl border border-primary-100"
            >
              <div
                v-for="(specification, index) in visibleSpecifications"
                :key="`${specification.label}-${index}`"
                class="grid gap-1 px-5 py-4 sm:grid-cols-[14rem_1fr]"
                :class="index > 0 ? 'border-t border-primary-100' : ''"
              >
                <dt class="font-semibold text-primary-900">
                  {{ specification.label }}
                </dt>

                <dd class="leading-relaxed text-text-secondary">
                  {{ specification.value }}
                </dd>
              </div>
            </dl>
          </section>

          <section
            id="reviews"
            class="rounded-4xl border border-primary-100 bg-white p-6 sm:p-8"
            :style="{ scrollMarginTop: `${scrollMarginOffset}px` }"
            aria-labelledby="reviews-heading"
            data-review-section
            data-detail-scroll-section
          >
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p
                  class="text-caption font-semibold uppercase tracking-[0.12em] text-primary-700"
                >
                  Trải nghiệm thực tế
                </p>
                <h2
                  id="reviews-heading"
                  class="mt-2 text-heading-2 text-primary-950"
                >
                  Đánh giá từ khách hàng
                </h2>
                <p class="mt-2 text-body-sm text-text-secondary">
                  Đánh giá chỉ được gửi từ sản phẩm thuộc đơn hàng đã mua.
                </p>
              </div>

              <span
                v-if="reviewTotalCount > 0"
                class="rounded-full bg-primary-50 px-3 py-1 text-caption font-semibold text-primary-700"
              >
                {{ reviewTotalCount }} lượt đánh giá
              </span>
            </div>

            <div
              class="mt-7 grid overflow-hidden rounded-3xl border border-primary-100 bg-[#fbfdfc] lg:grid-cols-[13rem_minmax(0,1fr)]"
              data-review-summary
            >
              <div
                class="flex flex-col items-center justify-center border-b border-primary-100 bg-[#f2f7f4] p-4 text-center lg:border-r lg:border-b-0"
              >
                <span
                  class="rounded-full bg-white px-2.5 py-0.5 text-caption font-semibold text-primary-700 shadow-xs"
                >
                  {{
                    reviewAverageRating >= 4.5 ? "Xuất sắc" : "Đánh giá chung"
                  }}
                </span>

                <strong
                  class="mt-2 text-4xl font-semibold tracking-tight text-primary-950"
                >
                  {{ reviewAverageRating.toFixed(1) }}
                </strong>

                <div
                  class="mt-2 flex justify-center gap-1 text-[#e3aa32]"
                  :aria-label="`${reviewAverageRating.toFixed(1)} trên 5 sao`"
                >
                  <Star
                    v-for="star in 5"
                    :key="star"
                    :class="[
                      'size-4',
                      star <= Math.round(reviewAverageRating)
                        ? 'fill-current'
                        : 'opacity-20',
                    ]"
                    aria-hidden="true"
                  />
                </div>

                <p class="mt-2 text-caption text-text-secondary">
                  {{ reviewTotalCount }} lượt đánh giá
                </p>

                <div
                  v-if="satisfactionPercentage > 0"
                  class="mt-3 w-full border-t border-primary-100 pt-2.5 text-caption font-semibold text-primary-700"
                >
                  {{ satisfactionPercentage }}% khách hàng hài lòng
                </div>
              </div>

              <div class="flex flex-col justify-center p-4 sm:p-5">
                <div
                  v-for="row in reviewDistribution"
                  :key="row.rating"
                  class="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-3 py-1.5 text-caption"
                >
                  <span class="font-medium text-primary-950">
                    {{ row.rating }} sao
                  </span>

                  <span
                    class="h-1.5 overflow-hidden rounded-full bg-primary-100"
                  >
                    <span
                      class="block h-full rounded-full bg-primary-700"
                      :style="{ width: `${row.percentage}%` }"
                    />
                  </span>

                  <span class="text-right text-caption text-text-muted">
                    {{ row.count }}
                  </span>
                </div>
              </div>
            </div>

            <div
              class="mt-5 flex flex-col gap-3 rounded-2xl border border-primary-100 bg-white p-3 lg:flex-row lg:items-center lg:justify-between"
              aria-label="Bộ lọc đánh giá"
            >
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="min-h-10 rounded-full border px-4 text-body-sm font-semibold transition"
                  :class="
                    activeReviewFilter === 'all'
                      ? 'border-primary bg-primary text-white'
                      : 'border-primary-100 bg-white text-primary-800 hover:bg-primary-50'
                  "
                  @click="setReviewFilter('all')"
                >
                  Tất cả ({{ reviewTotalCount }})
                </button>

                <button
                  v-for="rating in [5, 4, 3, 2, 1] as const"
                  :key="rating"
                  type="button"
                  class="min-h-10 rounded-full border px-4 text-body-sm font-medium transition"
                  :class="
                    activeReviewFilter === rating
                      ? 'border-primary bg-primary text-white'
                      : 'border-primary-100 bg-white text-primary-800 hover:bg-primary-50'
                  "
                  @click="setReviewFilter(rating)"
                >
                  {{ rating }} sao
                </button>

                <button
                  type="button"
                  class="inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-body-sm font-medium transition"
                  :class="
                    activeReviewFilter === 'images'
                      ? 'border-primary bg-primary text-white'
                      : 'border-primary-100 bg-white text-primary-800 hover:bg-primary-50'
                  "
                  :aria-pressed="activeReviewFilter === 'images'"
                  @click="setReviewFilter('images')"
                >
                  <Image class="size-4" aria-hidden="true" />
                  Có hình ảnh
                </button>
              </div>
            </div>

            <div
              v-if="visibleReviews.length"
              class="mt-5 space-y-4"
              data-review-list
            >
              <article
                v-for="review in visibleReviews"
                :key="review.id"
                class="rounded-3xl border border-primary-100 bg-white p-5 transition hover:border-primary-200 sm:p-6"
                data-product-review
              >
                <div class="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)]">
                  <div class="flex gap-3 md:block">
                    <div
                      class="grid size-12 shrink-0 place-items-center rounded-full border border-primary-100 bg-primary-50 font-semibold uppercase text-primary-900"
                      aria-hidden="true"
                    >
                      {{ review.initials }}
                    </div>

                    <div class="min-w-0 md:mt-3">
                      <strong class="block truncate text-primary-950">
                        {{ review.author }}
                      </strong>

                      <span
                        v-if="review.verified"
                        class="mt-1.5 inline-flex items-center gap-1 text-caption font-medium text-emerald-700"
                        data-review-verification
                      >
                        <BadgeCheck
                          class="size-4 fill-emerald-500 text-white"
                          aria-hidden="true"
                        />
                        Đã mua hàng
                      </span>

                      <time
                        v-if="review.date"
                        class="mt-2 block text-caption text-text-muted"
                      >
                        {{ review.date }}
                      </time>
                    </div>
                  </div>

                  <div class="min-w-0">
                    <div
                      class="flex flex-wrap items-center justify-between gap-3"
                    >
                      <div class="flex flex-wrap items-center gap-3">
                        <span
                          class="flex text-[#e3aa32]"
                          :aria-label="`${review.rating} trên 5 sao`"
                        >
                          <Star
                            v-for="star in 5"
                            :key="star"
                            :class="[
                              'size-4',
                              star <= review.rating
                                ? 'fill-current'
                                : 'opacity-20',
                            ]"
                            aria-hidden="true"
                          />
                        </span>

                        <strong class="text-primary-950">
                          {{ review.title }}
                        </strong>
                      </div>
                    </div>

                    <p
                      v-if="review.content"
                      class="mt-3 text-body-sm leading-7 text-text-secondary"
                    >
                      {{ review.content }}
                    </p>

                    <div
                      v-if="review.images.length"
                      class="mt-4 flex flex-wrap gap-3"
                      data-review-images
                    >
                      <button
                        v-for="(imageUrl, imageIndex) in review.images"
                        :key="imageUrl"
                        type="button"
                        class="block overflow-hidden rounded-xl border border-primary-100 bg-[#f7faf8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        @click="openLightbox(review.images, imageIndex)"
                      >
                        <img
                          :src="imageUrl"
                          alt="Hình ảnh đánh giá sản phẩm"
                          class="size-24 object-cover transition hover:scale-105"
                          loading="lazy"
                        />
                      </button>
                    </div>

                    <div
                      v-if="review.mizukiResponse"
                      class="mt-4 rounded-2xl border border-primary-100 bg-[#f7faf8] px-4 py-3"
                      data-mizuki-response
                    >
                      <p
                        class="text-caption font-semibold uppercase tracking-[0.08em] text-primary-700"
                      >
                        Phản hồi từ Mizuki
                      </p>
                      <p
                        class="mt-1.5 text-body-sm leading-6 text-text-secondary"
                      >
                        {{ review.mizukiResponse }}
                      </p>
                    </div>

                    <div
                      class="mt-5 flex flex-wrap items-center justify-end gap-5 border-t border-primary-100 pt-4 text-body-sm text-text-secondary"
                    >
                      <span class="inline-flex items-center gap-2">
                        <ThumbsUp class="size-4" aria-hidden="true" />
                        Hữu ích
                        <template v-if="review.helpfulCount !== undefined">
                          ({{ review.helpfulCount }})
                        </template>
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              <button
                v-if="canLoadMoreReviews"
                type="button"
                class="motion-interactive mx-auto flex min-h-11 items-center gap-2 rounded-full border border-primary-200 bg-white px-6 text-body-sm font-semibold text-primary-800 hover:bg-primary-50"
                @click="reviewPerPage += 3"
              >
                Xem thêm đánh giá
                <ChevronDown class="size-4" aria-hidden="true" />
              </button>
            </div>

            <div
              v-else
              class="mt-6 rounded-3xl border border-dashed border-primary-200 bg-[#f8fbf9] px-5 py-10 text-center"
              data-review-empty
            >
              <Star
                class="mx-auto size-9 text-primary-300"
                aria-hidden="true"
              />
              <p class="mt-3 font-semibold text-primary-950">
                Chưa có đánh giá phù hợp
              </p>
              <p class="mt-1 text-body-sm text-text-secondary">
                {{
                  activeReviewFilter === "images"
                    ? "Chưa có đánh giá nào kèm hình ảnh. Chọn Tất cả để xem toàn bộ nhận xét."
                    : "Chưa có đánh giá phù hợp với bộ lọc này."
                }}
              </p>
            </div>
          </section>

          <section
            id="questions"
            class="rounded-4xl border border-primary-100 bg-white p-6 sm:p-8"
            :style="{ scrollMarginTop: `${scrollMarginOffset}px` }"
            aria-labelledby="questions-heading"
            data-question-section
            data-detail-scroll-section
          >
            <div>
              <div>
                <h2
                  id="questions-heading"
                  class="text-heading-2 text-primary-950"
                >
                  Hỏi đáp về sản phẩm
                  <span class="font-normal text-text-muted">
                    ({{ allQuestionsCount }})
                  </span>
                </h2>
                <p class="mt-1 text-body-sm text-text-secondary">
                  Hỏi đáp mở cho mọi khách hàng, không yêu cầu đã mua sản phẩm.
                </p>
              </div>
            </div>

            <div
              class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]"
            >
              <div class="min-w-0 space-y-3">
                <article
                  v-for="question in visibleSubmittedQuestions"
                  :key="question.id"
                  class="rounded-2xl border border-primary-100 bg-white p-3 transition hover:border-primary-200"
                  data-submitted-question
                >
                  <div class="flex items-start gap-2">
                    <div
                      class="grid size-7 shrink-0 place-items-center rounded-full bg-primary-100 text-caption font-semibold text-primary-800"
                      aria-hidden="true"
                    >
                      {{ question.author.charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div
                        class="flex flex-wrap items-center justify-between gap-2"
                      >
                        <div class="flex flex-wrap items-center gap-1.5">
                          <span
                            class="text-body-sm font-semibold text-primary-950"
                          >
                            {{ question.author }}
                          </span>
                          <span
                            class="rounded-full bg-primary-50 px-2 py-0.5 text-caption font-medium text-primary-700"
                          >
                            Bạn
                          </span>
                        </div>
                        <span
                          class="rounded-full bg-[#fff2d6] px-2 py-0.5 text-caption font-semibold text-[#805914]"
                        >
                          Chờ tư vấn
                        </span>
                      </div>
                      <p class="mt-1 text-body-sm leading-6 text-primary-950">
                        {{ question.question }}
                      </p>
                      <p class="mt-1 text-caption text-text-muted">
                        {{ question.date }}
                      </p>

                      <div
                        class="mt-2 flex items-center gap-4 border-t border-primary-100 pt-2.5"
                      >
                        <button
                          type="button"
                          class="motion-interactive inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-caption font-medium text-text-secondary hover:bg-primary-50"
                          :class="
                            likedQuestionIds.has(question.id) &&
                            'text-[#c43d38]'
                          "
                          :aria-pressed="likedQuestionIds.has(question.id)"
                          @click="toggleQuestionLike(question.id)"
                        >
                          <ThumbsUp
                            :class="[
                              'size-3.5',
                              likedQuestionIds.has(question.id) &&
                                'fill-current',
                            ]"
                            aria-hidden="true"
                          />
                          Thích ({{ questionLikeCount(question.id) }})
                        </button>
                        <button
                          type="button"
                          class="motion-interactive inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-caption font-medium text-text-secondary hover:bg-primary-50"
                          :aria-pressed="replyingQuestionIds.has(question.id)"
                          @click="toggleReplyForm(question.id)"
                        >
                          <MessageSquare class="size-3.5" aria-hidden="true" />
                          Trả lời
                        </button>
                      </div>

                      <div
                        v-if="replyingQuestionIds.has(question.id)"
                        class="mt-2.5"
                      >
                        <textarea
                          v-model="replyDrafts[question.id]"
                          rows="2"
                          class="w-full resize-y rounded-xl border border-primary-200 bg-[#f7faf8] px-3 py-2 text-body-sm text-primary-950 outline-none placeholder:text-text-muted focus:border-primary-600 focus:ring-2 focus:ring-primary-200"
                          placeholder="Viết bình luận của bạn..."
                        />
                        <div class="mt-2 flex justify-end gap-2">
                          <BaseButton
                            type="button"
                            variant="outline"
                            size="sm"
                            @click="toggleReplyForm(question.id)"
                          >
                            Hủy
                          </BaseButton>
                          <BaseButton
                            type="button"
                            size="sm"
                            class="text-white!"
                          >
                            <template #icon><Send class="size-4" /></template>
                            Gửi câu trả lời
                          </BaseButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>

                <article
                  v-for="question in visibleProductQuestions"
                  :key="question.id"
                  class="rounded-2xl border border-primary-100 bg-white p-3 transition hover:border-primary-200"
                  data-product-question
                >
                  <div class="flex items-start gap-2">
                    <div
                      class="grid size-7 shrink-0 place-items-center rounded-full bg-primary-100 text-caption font-semibold text-primary-800"
                      aria-hidden="true"
                    >
                      {{ (question.author || "KH").charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span
                          v-if="question.author"
                          class="text-body-sm font-semibold text-primary-950"
                        >
                          {{ question.author }}
                        </span>
                        <span
                          v-if="question.date"
                          class="text-caption text-text-muted"
                        >
                          {{ question.date }}
                        </span>
                      </div>
                      <p class="mt-1 text-body-sm leading-6 text-primary-950">
                        {{ question.question }}
                      </p>

                      <div
                        v-if="question.answers.length"
                        class="mt-2 space-y-2"
                      >
                        <div
                          v-for="answer in question.answers"
                          :key="answer.id"
                          class="rounded-xl border border-primary-100 bg-[#f7faf8] px-3.5 py-2.5"
                        >
                          <p
                            class="text-caption font-semibold uppercase tracking-[0.08em] text-primary-700"
                          >
                            {{
                              answer.author
                                ? `${answer.author} trả lời`
                                : "Trả lời"
                            }}
                          </p>

                          <p
                            class="mt-1 text-body-sm leading-6 text-text-secondary"
                          >
                            {{ answer.text }}
                          </p>

                          <time
                            v-if="answer.date"
                            class="mt-1 block text-caption text-text-muted"
                          >
                            {{ answer.date }}
                          </time>
                        </div>
                      </div>

                      <div
                        class="mt-2 flex items-center gap-4 border-t border-primary-100 pt-2.5"
                      >
                        <button
                          type="button"
                          class="motion-interactive inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-caption font-medium text-text-secondary hover:bg-primary-50"
                          :class="
                            likedQuestionIds.has(question.id) &&
                            'text-[#c43d38]'
                          "
                          :aria-pressed="likedQuestionIds.has(question.id)"
                          @click="toggleQuestionLike(question.id)"
                        >
                          <ThumbsUp
                            :class="[
                              'size-3.5',
                              likedQuestionIds.has(question.id) &&
                                'fill-current',
                            ]"
                            aria-hidden="true"
                          />
                          Thích ({{ questionLikeCount(question.id) }})
                        </button>
                        <button
                          type="button"
                          class="motion-interactive inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-caption font-medium text-text-secondary hover:bg-primary-50"
                          :aria-pressed="replyingQuestionIds.has(question.id)"
                          @click="toggleReplyForm(question.id)"
                        >
                          <MessageSquare class="size-3.5" aria-hidden="true" />
                          Trả lời
                        </button>
                      </div>

                      <div
                        v-if="replyingQuestionIds.has(question.id)"
                        class="mt-2.5"
                      >
                        <textarea
                          v-model="replyDrafts[question.id]"
                          rows="2"
                          class="w-full resize-y rounded-xl border border-primary-200 bg-[#f7faf8] px-3 py-2 text-body-sm text-primary-950 outline-none placeholder:text-text-muted focus:border-primary-600 focus:ring-2 focus:ring-primary-200"
                          placeholder="Viết bình luận của bạn..."
                        />
                        <div class="mt-2 flex justify-end gap-2">
                          <BaseButton
                            type="button"
                            variant="outline"
                            size="sm"
                            @click="toggleReplyForm(question.id)"
                          >
                            Hủy
                          </BaseButton>
                          <BaseButton
                            type="button"
                            size="sm"
                            class="text-white!"
                          >
                            <template #icon><Send class="size-4" /></template>
                            Gửi câu trả lời
                          </BaseButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>

                <button
                  v-if="canLoadMoreQuestions"
                  type="button"
                  class="motion-interactive mx-auto flex min-h-10 items-center gap-2 rounded-full border border-primary-200 bg-white px-5 text-body-sm font-semibold text-primary-800 hover:bg-primary-50"
                  @click="loadMoreQuestions"
                >
                  Xem thêm câu hỏi
                  <ChevronDown class="size-4" aria-hidden="true" />
                </button>

                <p
                  v-if="allQuestionsCount === 0"
                  class="rounded-2xl border border-dashed border-primary-200 bg-[#f8fbf9] p-8 text-center text-body-sm text-text-secondary"
                  data-question-empty
                >
                  Chưa có câu hỏi nào cho sản phẩm này.
                </p>
              </div>

              <div class="lg:sticky lg:top-24 lg:self-start">
                <form
                  class="overflow-hidden rounded-3xl border border-primary-200 bg-white shadow-md"
                  data-question-form
                  @submit.prevent="submitQuestion"
                >
                  <div class="bg-primary-900 px-5 py-4">
                    <p class="text-body-sm font-semibold text-white">
                      Đặt câu hỏi của bạn
                    </p>
                    <p class="mt-1 text-caption text-primary-100">
                      Không chia sẻ số điện thoại hoặc thông tin nhạy cảm.
                    </p>
                  </div>

                  <div class="p-5">
                    <label for="product-question" class="sr-only">
                      Câu hỏi của bạn
                    </label>
                    <textarea
                      id="product-question"
                      v-model="questionDraft"
                      rows="5"
                      maxlength="500"
                      class="min-h-32 w-full resize-y rounded-2xl border border-primary-200 bg-[#f7faf8] px-4 py-3 text-body-sm text-primary-950 outline-none placeholder:text-text-muted focus:border-primary-600 focus:ring-2 focus:ring-primary-200"
                      placeholder="Đặt câu hỏi về sản phẩm, loại da, cách dùng hoặc tình trạng da của bạn..."
                      :aria-invalid="questionError ? 'true' : undefined"
                      :aria-describedby="
                        questionError ? 'product-question-error' : undefined
                      "
                      @input="clearQuestionFeedback"
                    />
                    <div class="mt-3 flex items-center justify-between gap-3">
                      <p class="text-caption text-text-muted">
                        {{ questionDraft.length }}/500 ký tự
                      </p>
                      <BaseButton
                        type="submit"
                        size="sm"
                        class="text-white!"
                        :disabled="questionDraft.trim().length === 0"
                      >
                        <template #icon><Send class="size-4" /></template>
                        Gửi câu hỏi
                      </BaseButton>
                    </div>
                    <p
                      v-if="questionError"
                      id="product-question-error"
                      class="mt-3 text-body-sm font-medium text-[#a5322d]"
                      role="alert"
                    >
                      {{ questionError }}
                    </p>
                    <p
                      v-else-if="questionFeedback"
                      class="mt-3 text-body-sm font-medium text-primary-800"
                      role="status"
                    >
                      {{ questionFeedback }}
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section
            id="branches"
            class="rounded-4xl border border-primary-100 bg-white p-6 sm:p-8"
            :style="{ scrollMarginTop: `${scrollMarginOffset}px` }"
            aria-labelledby="branches-heading"
            data-branch-section
            data-detail-scroll-section
          >
            <ProductBranchAvailabilityCarousel :branches="product.branches">
              <template #heading>
                <div class="flex min-w-0 items-center gap-3">
                  <Store
                    class="size-6 flex-none text-primary-700"
                    aria-hidden="true"
                  />
                  <h2
                    id="branches-heading"
                    class="min-w-0 text-heading-2 text-primary-950"
                  >
                    Chi nhánh còn hàng
                  </h2>
                </div>
              </template>
            </ProductBranchAvailabilityCarousel>
          </section>

          <ProductSuggestions
            v-if="relatedProducts.length"
            :products="relatedProducts"
          />
        </div>
      </template>
    </div>

    <Teleport to="body">
      <div
        v-if="lightboxOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Xem ảnh đánh giá"
        @click.self="closeLightbox"
        @keydown.esc="closeLightbox"
      >
        <button
          type="button"
          class="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Đóng"
          @click="closeLightbox"
        >
          <X class="size-5" aria-hidden="true" />
        </button>

        <button
          v-if="lightboxImages.length > 1"
          type="button"
          class="absolute left-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Ảnh trước"
          @click="showPreviousImage"
        >
          <ChevronLeft class="size-6" aria-hidden="true" />
        </button>

        <img
          :src="lightboxImages[lightboxIndex]"
          alt="Hình ảnh đánh giá sản phẩm phóng to"
          class="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
        />

        <button
          v-if="lightboxImages.length > 1"
          type="button"
          class="absolute right-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Ảnh sau"
          @click="showNextImage"
        >
          <ChevronRight class="size-6" aria-hidden="true" />
        </button>

        <p
          v-if="lightboxImages.length > 1"
          class="absolute bottom-6 rounded-full bg-white/10 px-3 py-1 text-caption text-white"
        >
          {{ lightboxIndex + 1 }}/{{ lightboxImages.length }}
        </p>
      </div>
    </Teleport>
  </CustomerLayout>
</template>
