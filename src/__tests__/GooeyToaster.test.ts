import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/vue'
import { toast } from 'vue-sonner'
import GooeyToaster from '../components/GooeyToaster.vue'
import { _resetQueue, _getMostRecentActiveId, gooeyToast } from '../gooey-toast'

vi.mock('vue-sonner', () => ({
  toast: {
    custom: vi.fn(),
    dismiss: vi.fn(),
  },
  Toaster: {
    name: 'Toaster',
    template: '<div data-testid="sonner-toaster" />',
  },
}))

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

describe('GooeyToaster', () => {
  it('renders without crashing', () => {
    const { container } = render(GooeyToaster)
    expect(container).toBeDefined()
  })

  it('renders with custom position', () => {
    const { container } = render(GooeyToaster, {
      props: { position: 'top-center' },
    })
    expect(container).toBeDefined()
  })

  it('renders with all props', () => {
    const { container } = render(GooeyToaster, {
      props: {
        position: 'top-right',
        duration: 5000,
        gap: 20,
        offset: '32px',
        theme: 'dark',
      },
    })
    expect(container).toBeDefined()
  })
})

describe('GooeyToaster closeOnEscape', () => {
  const mockDismiss = toast.dismiss as ReturnType<typeof vi.fn>
  const mockCustom = toast.custom as ReturnType<typeof vi.fn>

  beforeEach(() => {
    _resetQueue()
    mockDismiss.mockClear()
    mockCustom.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('dismisses the most recent toast when Escape is pressed', async () => {
    render(GooeyToaster)

    gooeyToast('Hello')
    const toastId = _getMostRecentActiveId()
    expect(toastId).toBeDefined()

    mockDismiss.mockClear()
    await fireEvent.keyDown(document, { key: 'Escape' })

    expect(mockDismiss).toHaveBeenCalledWith(toastId)
  })

  it('does not dismiss when closeOnEscape is false', async () => {
    render(GooeyToaster, { props: { closeOnEscape: false } })

    gooeyToast('Hello')

    mockDismiss.mockClear()
    await fireEvent.keyDown(document, { key: 'Escape' })

    expect(mockDismiss).not.toHaveBeenCalled()
  })

  it('does nothing when Escape is pressed with no active toasts', async () => {
    render(GooeyToaster)

    await fireEvent.keyDown(document, { key: 'Escape' })

    expect(mockDismiss).not.toHaveBeenCalled()
  })

  it('does not dismiss on non-Escape keys', async () => {
    render(GooeyToaster)

    gooeyToast('Hello')

    mockDismiss.mockClear()
    await fireEvent.keyDown(document, { key: 'Enter' })

    expect(mockDismiss).not.toHaveBeenCalled()
  })
})
