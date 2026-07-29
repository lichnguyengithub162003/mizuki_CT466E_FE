<script setup lang="ts">
const footerGroups = [
  {
    title: 'Về Mizuki',
    items: ['Câu chuyện thương hiệu', 'Hệ thống chi nhánh'],
  },
  {
    title: 'Hỗ trợ khách hàng',
    items: ['Hướng dẫn mua hàng', 'Câu hỏi thường gặp'],
  },
  {
    title: 'Chính sách',
    items: ['Giao hàng và đổi trả', 'Bảo mật thông tin'],
  },
  {
    title: 'Liên hệ',
    items: ['Kênh hỗ trợ', 'Góp ý trải nghiệm'],
  },
] as const
</script>

<template>
  <footer
    class="border-t border-border bg-primary-950 pb-20 text-primary-50 md:pb-0"
    aria-label="Chân trang Mizuki"
  >
    <div class="mx-auto grid w-full max-w-[90rem] gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-5 lg:px-7">
      <div class="sm:col-span-2 lg:col-span-1">
        <p class="customer-wordmark text-2xl text-white">Mizuki</p>
        <p class="mt-3 max-w-xs text-body-sm text-primary-200">
          Nền tảng mua sắm và chăm sóc sắc đẹp. Nội dung liên hệ và chính sách đang là bản demo.
        </p>
      </div>
      <section v-for="group in footerGroups" :key="group.title" :aria-labelledby="`footer-${group.title}`">
        <h2 :id="`footer-${group.title}`" class="text-body-md font-semibold text-white">
          {{ group.title }}
        </h2>
        <ul class="mt-3 grid gap-2 text-body-sm text-primary-200">
          <li v-for="item in group.items" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>
    <div class="border-t border-white/10 px-5 py-4 text-center text-caption text-primary-300">
      Phương thức thanh toán sẽ được hiển thị khi có dữ liệu xác nhận · Nội dung demo
    </div>
  </footer>
</template>
