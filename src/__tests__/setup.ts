import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/vue'
import '@testing-library/jest-dom/vitest'

beforeEach(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  }
})

afterEach(() => {
  cleanup()
})

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.mock('motion-v', () => ({
  Motion: {
    name: 'Motion',
    props: ['tag', 'animate', 'initial', 'exit', 'transition', 'style', 'class'],
    template:
      '<component :is="tag || \'div\'" :class="$props.class" :style="$props.style"><slot /></component>',
  },
  AnimatePresence: {
    name: 'AnimatePresence',
    template: '<slot />',
  },
  animate: () => ({ stop: () => {} }),
}))

vi.mock('vue-sonner', () => ({
  toast: {
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: {
    name: 'Toaster',
    template: '<div data-sonner-toaster />',
  },
}))
