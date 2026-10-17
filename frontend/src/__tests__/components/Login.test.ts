import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import Login from '@/views/login/index.vue'

// Mock router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    login: vi.fn().mockResolvedValue({}),
  }),
}))

describe('Login Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('应该渲染登录表单', () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [ElementPlus],
      },
    })

    expect(wrapper.find('h1').text()).toBe('网吧 X · 工作台')
    expect(wrapper.find('input[placeholder="请输入用户名"]').exists()).toBe(true)
    expect(wrapper.find('input[placeholder="请输入密码"]').exists()).toBe(true)
  })

  it('应该能够输入用户名和密码', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [ElementPlus],
      },
    })

    const usernameInput = wrapper.find('input[placeholder="请输入用户名"]')
    const passwordInput = wrapper.find('input[placeholder="请输入密码"]')

    await usernameInput.setValue('admin')
    await passwordInput.setValue('admin123')

    expect((usernameInput.element as HTMLInputElement).value).toBe('admin')
    expect((passwordInput.element as HTMLInputElement).value).toBe('admin123')
  })

  it('应该显示登录按钮', () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [ElementPlus],
      },
    })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.text()).toContain('登录')
  })
})
