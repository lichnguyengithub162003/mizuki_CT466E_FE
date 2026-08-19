<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ArrowRight, Sparkles } from "@lucide/vue";
import { useRouter } from "vue-router";
import BaseButton from "@/components/common/BaseButton.vue";
import { ROUTE_NAMES } from "@/constants/routes";
import { getMobileOnboardingMediaQuery } from "@/utils/auth/mobileOnboarding";

const slides = [
  {
    eyebrow: "MIZUKI EVERYDAY",
    title: "Chọn chăm sóc hợp với bạn.",
    description:
      "Khám phá chăm sóc da, tóc và mỹ phẩm trong một trải nghiệm gọn nhẹ.",
    imageSrc: "/images/auth/onboarding-1.jpg",
    imageAlt: "Không gian chăm sóc lấy cảm hứng từ thiên nhiên",
    objectPosition: "86% center",
  },
  {
    eyebrow: "CHĂM SÓC GẦN BẠN",
    title: "Đặt lịch, chọn chi nhánh, thư giãn.",
    description:
      "Chủ động chọn dịch vụ và nhận ưu đãi phù hợp tại chi nhánh Mizuki thuận tiện.",
    imageSrc: "/images/auth/onboarding-2.jpg",
    imageAlt: "Không gian tươi sáng cho hành trình chăm sóc cá nhân",
    objectPosition: "52% center",
  },
] as const;

const activeIndex = ref(0);
const activeSlide = computed(() => slides[activeIndex.value]);

const router = useRouter();

let onboardingMedia: MediaQueryList | null = null;

function handleOnboardingViewport(
  event: MediaQueryListEvent | MediaQueryList,
): void {
  if (!event.matches) {
    void router.replace({ name: ROUTE_NAMES.login });
  }
}

onMounted(() => {
  onboardingMedia = getMobileOnboardingMediaQuery();

  if (!onboardingMedia) {
    void router.replace({ name: ROUTE_NAMES.login });
    return;
  }

  handleOnboardingViewport(onboardingMedia);
  onboardingMedia.addEventListener?.("change", handleOnboardingViewport);
});

onBeforeUnmount(() => {
  onboardingMedia?.removeEventListener?.("change", handleOnboardingViewport);
});

async function finishOnboarding(): Promise<void> {
  window.localStorage.setItem("mizuki:onboarding-seen", "true");
  await router.replace({ name: ROUTE_NAMES.login });
}

async function continueOnboarding(): Promise<void> {
  if (activeIndex.value < slides.length - 1) {
    activeIndex.value += 1;
    return;
  }

  await finishOnboarding();
}
</script>

<template>
  <main
    class="min-h-svh bg-primary-950 text-white md:grid md:place-items-center md:p-4"
    data-testid="onboarding-page"
  >
    <section
      class="relative mx-auto flex min-h-svh w-full max-w-md flex-col overflow-hidden bg-primary-900 p-5 shadow-lg md:min-h-[min(52rem,calc(100svh-2rem))] md:rounded-[2rem]"
      :data-asset-slot="activeSlide.imageSrc"
    >
      <img
        :src="activeSlide.imageSrc"
        :alt="activeSlide.imageAlt"
        class="absolute inset-0 h-full w-full object-cover object-center"
        :style="{ objectPosition: activeSlide.objectPosition }"
        data-testid="onboarding-image"
      />
      <div class="auth-onboarding-scrim absolute inset-0" aria-hidden="true" />
      <header class="relative z-10 flex items-center justify-between">
        <span class="customer-wordmark text-lg">MIZUKI</span>
        <button
          type="button"
          class="rounded-pill px-3 py-2 text-body-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-white"
          @click="finishOnboarding"
        >
          Bỏ qua
        </button>
      </header>

      <div class="relative z-10 mt-auto pb-2">
        <p
          class="flex items-center gap-2 text-caption font-bold tracking-[0.16em] text-white/85"
        >
          <Sparkles class="size-4" aria-hidden="true" />
          {{ activeSlide.eyebrow }}
        </p>
        <h1
          class="mt-3 max-w-sm text-[2.6rem] font-bold leading-[1.03] tracking-[-0.045em] text-white"
        >
          {{ activeSlide.title }}
        </h1>
        <p class="mt-4 max-w-sm text-body-md text-white/90">
          {{ activeSlide.description }}
        </p>

        <div
          class="mt-7 flex justify-center gap-2"
          aria-label="Tiến trình giới thiệu"
        >
          <button
            v-for="(_, index) in slides"
            :key="index"
            type="button"
            class="h-2 rounded-pill transition-all focus-visible:outline-white"
            :class="index === activeIndex ? 'w-8 bg-white' : 'w-2 bg-white/45'"
            :aria-label="`Xem bước ${index + 1}`"
            :aria-current="index === activeIndex ? 'step' : undefined"
            @click="activeIndex = index"
          />
        </div>
        <BaseButton
          size="lg"
          class="mt-5 w-full rounded-xl bg-white text-primary-950 shadow-md hover:bg-white/90"
          @click="continueOnboarding"
        >
          {{ activeIndex === slides.length - 1 ? "Bắt đầu" : "Tiếp tục" }}
          <ArrowRight class="size-4" aria-hidden="true" />
        </BaseButton>
      </div>
    </section>
  </main>
</template>
