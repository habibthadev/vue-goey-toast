import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/vue'
import { defineComponent, h } from 'vue'
import ToastErrorBoundary from '../components/ToastErrorBoundary.vue'

const ThrowingComponent = defineComponent({
  setup() {
    throw new Error('Test render error')
  },
  render() {
    return null
  },
})

describe('ToastErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders children when there is no error', () => {
    const { getByText } = render(ToastErrorBoundary, {
      slots: {
        default: () => h('div', 'Hello'),
      },
    })
    expect(getByText('Hello')).toBeInTheDocument()
  })

  it('renders null when a child throws during rendering', () => {
    const { container } = render(ToastErrorBoundary, {
      slots: {
        default: () => h(ThrowingComponent),
      },
    })
    expect(container.textContent).toBe('')
  })

  it('logs the error in development', () => {
    render(ToastErrorBoundary, {
      slots: {
        default: () => h(ThrowingComponent),
      },
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ToastErrorBoundary] Caught error:',
      expect.any(Error)
    )
  })
})
