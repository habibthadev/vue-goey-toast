import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { useReducedMotion } from '../useReducedMotion'

describe('useReducedMotion', () => {
  let listeners: Array<(event: MediaQueryListEvent) => void>
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    listeners = []
    originalMatchMedia = window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  const setupMatchMedia = (matches: boolean) => {
    window.matchMedia = vi.fn((_query: string) => ({
      matches,
      media: _query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => {
        listeners.push(cb)
      },
      removeEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => {
        listeners = listeners.filter((l) => l !== cb)
      },
      dispatchEvent: vi.fn(),
    })) as typeof window.matchMedia
  }

  it('returns false when reduced motion is not preferred', async () => {
    setupMatchMedia(false)
    const TestComponent = defineComponent({
      setup() {
        const prefersReducedMotion = useReducedMotion()
        return { prefersReducedMotion }
      },
      render() {
        return h('div', { 'data-testid': 'result' }, String(this.prefersReducedMotion))
      },
    })
    const wrapper = mount(TestComponent)
    await flushPromises()
    expect(wrapper.find('[data-testid="result"]').text()).toBe('false')
  })

  it('returns true when reduced motion is preferred', async () => {
    setupMatchMedia(true)
    const TestComponent = defineComponent({
      setup() {
        const prefersReducedMotion = useReducedMotion()
        return { prefersReducedMotion }
      },
      render() {
        return h('div', { 'data-testid': 'result' }, String(this.prefersReducedMotion))
      },
    })
    const wrapper = mount(TestComponent)
    await flushPromises()
    expect(wrapper.find('[data-testid="result"]').text()).toBe('true')
  })

  it('updates when preference changes', async () => {
    setupMatchMedia(false)
    const TestComponent = defineComponent({
      setup() {
        const prefersReducedMotion = useReducedMotion()
        return { prefersReducedMotion }
      },
      render() {
        return h('div', { 'data-testid': 'result' }, String(this.prefersReducedMotion))
      },
    })
    const wrapper = mount(TestComponent)
    await flushPromises()
    expect(wrapper.find('[data-testid="result"]').text()).toBe('false')

    for (const listener of listeners) {
      listener({ matches: true } as MediaQueryListEvent)
    }
    await nextTick()

    expect(wrapper.find('[data-testid="result"]').text()).toBe('true')
  })

  it('cleans up event listener on unmount', async () => {
    setupMatchMedia(false)
    const TestComponent = defineComponent({
      setup() {
        const prefersReducedMotion = useReducedMotion()
        return { prefersReducedMotion }
      },
      render() {
        return h('div')
      },
    })
    const wrapper = mount(TestComponent)
    await flushPromises()
    expect(listeners).toHaveLength(1)

    wrapper.unmount()
    expect(listeners).toHaveLength(0)
  })
})
