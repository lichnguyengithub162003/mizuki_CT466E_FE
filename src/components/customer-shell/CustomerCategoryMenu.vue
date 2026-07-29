<script setup lang="ts">
import { ChevronDown, Droplets, Palette, Scissors, Sparkles } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import BasePopover from '@/components/common/BasePopover.vue'

const open = ref(false)

const categoryGroups = [
  {
    label: 'Chăm sóc da',
    icon: Droplets,
    sections: [
      { label: 'Làm sạch', items: ['Sữa rửa mặt', 'Tẩy trang'] },
      { label: 'Dưỡng da', items: ['Serum', 'Kem dưỡng'] },
    ],
  },
  {
    label: 'Trang điểm',
    icon: Palette,
    sections: [
      { label: 'Trang điểm mặt', items: [] },
      { label: 'Trang điểm môi', items: [] },
    ],
  },
  {
    label: 'Chăm sóc tóc',
    icon: Scissors,
    sections: [
      { label: 'Dầu gội', items: [] },
      { label: 'Dầu xả', items: [] },
    ],
  },
] as const

function closeMenu(): void {
  open.value = false
}
</script>

<template>
  <BasePopover
    v-model="open"
    align="start"
    :side-offset="10"
    class="w-[min(46rem,calc(100vw-2rem))] rounded-2xl border-white/80 bg-background/98 p-5 shadow-lg"
  >
    <template #trigger>
      <button
        type="button"
        class="motion-interactive inline-flex min-h-10 items-center gap-2 rounded-pill border border-primary-100 bg-admin-sage-soft px-4 text-body-sm font-normal leading-6 tracking-[0.01em] text-primary-900 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        :aria-expanded="open"
        aria-label="Mở danh mục sản phẩm"
      >
        <Sparkles class="size-4 text-primary-700" aria-hidden="true" />
        Danh mục
        <ChevronDown
          class="size-3.5 transition-transform duration-(--duration-fast)"
          :class="open && 'rotate-180'"
          aria-hidden="true"
        />
      </button>
    </template>

    <section aria-labelledby="customer-category-menu-title">
      <div class="mb-4 flex items-center justify-between gap-4 border-b border-border/70 pb-3">
        <div>
          <p class="text-caption uppercase tracking-[0.12em] text-primary-700">Khám phá</p>
          <h2 id="customer-category-menu-title" class="mt-1 text-heading-4">Danh mục sản phẩm</h2>
        </div>
        <span class="rounded-pill bg-primary-50 px-3 py-1 text-caption text-primary-800">
          Nội dung demo
        </span>
      </div>

      <div class="grid gap-5 sm:grid-cols-3">
        <section
          v-for="group in categoryGroups"
          :key="group.label"
          :aria-labelledby="`category-${group.label}`"
        >
          <h3
            :id="`category-${group.label}`"
            class="flex items-center gap-2 text-body-md font-semibold text-foreground"
          >
            <span class="grid size-8 place-items-center rounded-xl bg-admin-sage-soft text-primary-700">
              <component :is="group.icon" class="size-4" aria-hidden="true" />
            </span>
            {{ group.label }}
          </h3>
          <ul class="mt-3 grid gap-2">
            <li v-for="section in group.sections" :key="section.label">
              <RouterLink
                :to="`/customer-shell?section=categories`"
                class="inline-flex min-h-8 items-center rounded-lg text-body-sm font-medium text-primary-900 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                @click="closeMenu"
              >
                {{ section.label }}
              </RouterLink>
              <ul v-if="section.items.length" class="mt-1 grid gap-1 border-l border-primary-100 pl-3">
                <li v-for="item in section.items" :key="item">
                  <RouterLink
                    to="/customer-shell?section=categories"
                    class="inline-flex min-h-7 items-center rounded-md text-caption text-muted-foreground hover:text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    @click="closeMenu"
                  >
                    {{ item }}
                  </RouterLink>
                </li>
              </ul>
            </li>
          </ul>
        </section>
      </div>
    </section>
  </BasePopover>
</template>
