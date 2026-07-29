<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { HomeCategory } from '@/types/home'
import HomeIcon from './HomeIcon.vue'

const props = defineProps<{
  categories: readonly HomeCategory[]
}>()

const activeCategoryId = ref<string | null>(null)
const navRef = ref<HTMLElement | null>(null)
const triggerRefs = new Map<string, HTMLButtonElement>()
let closeTimeoutId: number | undefined

function setTriggerRef(id: string, element: unknown): void {
  if (element instanceof HTMLButtonElement) {
    triggerRefs.set(id, element)
  }
}

function cancelClose(): void {
  if (closeTimeoutId !== undefined) {
    window.clearTimeout(closeTimeoutId)
    closeTimeoutId = undefined
  }
}

function openCategory(category: HomeCategory): void {
  cancelClose()
  if (!category.children?.length) {
    activeCategoryId.value = null
    return
  }
  activeCategoryId.value = category.id
}

function scheduleClose(): void {
  cancelClose()
  closeTimeoutId = window.setTimeout(() => {
    activeCategoryId.value = null
    closeTimeoutId = undefined
  }, 180)
}

async function closeCategory(returnFocus = false): Promise<void> {
  cancelClose()
  const previousId = activeCategoryId.value
  activeCategoryId.value = null
  if (returnFocus && previousId) {
    await nextTick()
    triggerRefs.get(previousId)?.focus()
  }
}

function handleOutsidePointer(event: PointerEvent): void {
  const target = event.target
  if (target instanceof Node && !navRef.value?.contains(target)) {
    void closeCategory()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointer)
})

onBeforeUnmount(() => {
  cancelClose()
  document.removeEventListener('pointerdown', handleOutsidePointer)
})
</script>

<template>
  <nav
    ref="navRef"
    class="relative hidden w-56 shrink-0 rounded-3xl border border-border bg-surface p-3 shadow-xs lg:block"
    aria-label="Danh mục sản phẩm trang chủ"
    @mouseenter="cancelClose"
    @mouseleave="scheduleClose"
    @keydown.esc.prevent.stop="closeCategory(true)"
  >
    <h2 class="px-3 pb-2 pt-1 text-heading-4 text-primary-950">Danh mục</h2>
    <ul class="grid gap-0.5">
      <li
        v-for="category in props.categories.slice(0, 10)"
        :key="category.id"
        data-home-category-item
      >
        <button
          v-if="category.children?.length"
          :ref="(element) => setTriggerRef(category.id, element)"
          type="button"
          class="motion-interactive flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-body-sm font-normal text-text-secondary hover:bg-primary-50 hover:text-primary-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          :aria-expanded="activeCategoryId === category.id"
          :aria-controls="`home-category-panel-${category.id}`"
          @click="openCategory(category)"
          @focus="openCategory(category)"
          @mouseenter="openCategory(category)"
        >
          <HomeIcon :name="category.icon" class="size-4 shrink-0 text-primary-700" />
          <span class="min-w-0 flex-1 truncate">{{ category.label }}</span>
          <ChevronRight class="size-4 shrink-0" aria-hidden="true" />
        </button>
        <RouterLink
          v-else
          :to="category.href"
          class="motion-interactive flex min-h-10 items-center gap-2 rounded-xl px-3 text-body-sm font-normal text-text-secondary hover:bg-primary-50 hover:text-primary-950 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          @focus="closeCategory()"
        >
          <HomeIcon :name="category.icon" class="size-4 shrink-0 text-primary-700" />
          <span class="min-w-0 truncate">{{ category.label }}</span>
        </RouterLink>
      </li>
    </ul>

    <div
      v-for="category in props.categories.filter((item) => item.children?.length)"
      v-show="activeCategoryId === category.id"
      :id="`home-category-panel-${category.id}`"
      :key="`${category.id}-panel`"
      class="absolute left-[calc(100%+0.5rem)] top-0 z-20 w-[25rem] max-w-[calc(100vw-17rem)] rounded-3xl border border-border bg-surface p-5 shadow-lg before:absolute before:-left-2 before:top-0 before:h-full before:w-2 before:content-['']"
      role="region"
      :aria-label="`Danh mục con ${category.label}`"
      data-home-category-panel
      @mouseenter="cancelClose"
      @mouseleave="scheduleClose"
    >
      <p class="text-caption font-semibold uppercase tracking-[0.11em] text-primary-700">
        {{ category.label }}
      </p>
      <div class="mt-4 grid grid-cols-2 gap-5">
        <section v-for="child in category.children" :key="child.id">
          <RouterLink
            :to="child.href"
            class="inline-flex min-h-10 items-center text-body-md font-semibold text-primary-950 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            @click="closeCategory()"
          >
            {{ child.label }}
          </RouterLink>
          <ul v-if="child.children?.length" class="mt-1 grid gap-1">
            <li v-for="grandchild in child.children" :key="grandchild.id">
              <RouterLink
                :to="grandchild.href"
                class="inline-flex min-h-9 items-center text-body-sm text-text-secondary hover:text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                @click="closeCategory()"
              >
                {{ grandchild.label }}
              </RouterLink>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </nav>
</template>
