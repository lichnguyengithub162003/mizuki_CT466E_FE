import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FoundationPage from '@/pages/foundation/FoundationPage.vue'

function mountFoundationPage() {
  return mount(FoundationPage, {
    global: {
      stubs: {
        RouterLink: true,
      },
    },
  })
}

describe('design token showcase', () => {
  it('renders every foundation token section', () => {
    const wrapper = mountFoundationPage()

    expect(wrapper.findAll('[data-token-section]')).toHaveLength(7)
  })

  it('uses the shared typography and layout utilities', () => {
    const wrapper = mountFoundationPage()

    expect(wrapper.find('.text-display-xl').exists()).toBe(true)
    expect(wrapper.find('.text-heading-1').exists()).toBe(true)
    expect(wrapper.find('.text-body-md').exists()).toBe(true)
    expect(wrapper.find('.text-caption').exists()).toBe(true)
    expect(wrapper.find('.app-container').exists()).toBe(true)
    expect(wrapper.find('.content-container').exists()).toBe(true)
    expect(wrapper.find('.section-spacing').exists()).toBe(true)
  })

  it('uses brand, semantic, radius, and shadow theme utilities', () => {
    const wrapper = mountFoundationPage()

    expect(wrapper.find('.bg-primary-50').exists()).toBe(true)
    expect(wrapper.find('.bg-success').exists()).toBe(true)
    expect(wrapper.find('.bg-warning').exists()).toBe(true)
    expect(wrapper.find('.rounded-pill').exists()).toBe(true)
    expect(wrapper.find('.shadow-lg').exists()).toBe(true)
  })
})
