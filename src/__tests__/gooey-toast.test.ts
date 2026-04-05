import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import { nextTick } from 'vue'
import { toast } from 'vue-sonner'
import { SuccessIcon, ErrorIcon, WarningIcon, InfoIcon, SpinnerIcon } from '../icons'
import GooeyToast from '../components/GooeyToast.vue'
import GooeyToaster from '../components/GooeyToaster.vue'
import { gooeyToast, _resetQueue } from '../gooey-toast'

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
    template: '<div data-testid="sonner-toaster" />',
  },
}))

describe('Icon components', () => {
  it('SuccessIcon renders an SVG with correct size and stroke', () => {
    const { container } = render(SuccessIcon, { props: { size: 18 } })
    const svg = container.querySelector('svg')!
    expect(svg).toBeInTheDocument()
    expect(svg.getAttribute('width')).toBe('18')
    expect(svg.getAttribute('height')).toBe('18')
    expect(svg.getAttribute('stroke')).toBe('currentColor')
  })

  it('ErrorIcon renders an SVG with correct size and stroke', () => {
    const { container } = render(ErrorIcon, { props: { size: 18 } })
    const svg = container.querySelector('svg')!
    expect(svg).toBeInTheDocument()
    expect(svg.getAttribute('width')).toBe('18')
    expect(svg.getAttribute('height')).toBe('18')
    expect(svg.getAttribute('stroke')).toBe('currentColor')
  })

  it('WarningIcon renders an SVG with correct size and stroke', () => {
    const { container } = render(WarningIcon, { props: { size: 18 } })
    const svg = container.querySelector('svg')!
    expect(svg).toBeInTheDocument()
    expect(svg.getAttribute('width')).toBe('18')
    expect(svg.getAttribute('height')).toBe('18')
    expect(svg.getAttribute('stroke')).toBe('currentColor')
  })

  it('InfoIcon renders an SVG with correct size and stroke', () => {
    const { container } = render(InfoIcon, { props: { size: 18 } })
    const svg = container.querySelector('svg')!
    expect(svg).toBeInTheDocument()
    expect(svg.getAttribute('width')).toBe('18')
    expect(svg.getAttribute('height')).toBe('18')
    expect(svg.getAttribute('stroke')).toBe('currentColor')
  })

  it('SpinnerIcon renders an SVG with spin animation', () => {
    const { container } = render(SpinnerIcon, { props: { size: 18 } })
    const svg = container.querySelector('svg')!
    expect(svg).toBeInTheDocument()
    expect(svg.getAttribute('width')).toBe('18')
    expect(svg.getAttribute('height')).toBe('18')
    expect(svg.getAttribute('stroke')).toBe('currentColor')
  })
})

describe('GooeyToast component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders in compact mode with title only', () => {
    render(GooeyToast, {
      props: {
        title: 'Success!',
        type: 'success',
        phase: 'success',
      },
    })
    expect(screen.getByText('Success!')).toBeInTheDocument()
  })

  it('renders in expanded mode with title and description', async () => {
    render(GooeyToast, {
      props: {
        title: 'Warning',
        description: 'Something needs attention',
        type: 'warning',
        phase: 'warning',
      },
    })
    vi.advanceTimersByTime(400)
    await nextTick()
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('Something needs attention')).toBeInTheDocument()
  })

  it('renders action button with correct label', async () => {
    const onClick = vi.fn()
    render(GooeyToast, {
      props: {
        title: 'Error occurred',
        type: 'error',
        phase: 'error',
        action: { label: 'Retry', onClick },
      },
    })
    vi.advanceTimersByTime(400)
    await nextTick()
    const button = screen.getByRole('button', { name: 'Retry' })
    expect(button).toBeInTheDocument()
  })

  it('renders spinner icon in loading state', () => {
    const { container } = render(GooeyToast, {
      props: {
        title: 'Loading...',
        type: 'info',
        phase: 'loading',
      },
    })
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    const svg = container.querySelector('svg[stroke="currentColor"]')!
    expect(svg).toBeInTheDocument()
    expect(svg.getAttribute('stroke')).toBe('currentColor')
  })

  it('calls action onClick when button is clicked', async () => {
    const onClick = vi.fn()
    render(GooeyToast, {
      props: {
        title: 'Error',
        type: 'error',
        phase: 'error',
        action: { label: 'Retry', onClick },
      },
    })
    vi.advanceTimersByTime(400)
    await nextTick()
    const button = screen.getByRole('button', { name: 'Retry' })
    await fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('GooeyToaster', () => {
  it('renders without crashing', () => {
    const { container } = render(GooeyToaster)
    expect(container).toBeTruthy()
  })
})

describe('gooeyToast API', () => {
  it('has success method as a function', () => {
    expect(typeof gooeyToast.success).toBe('function')
  })

  it('has error method as a function', () => {
    expect(typeof gooeyToast.error).toBe('function')
  })

  it('has warning method as a function', () => {
    expect(typeof gooeyToast.warning).toBe('function')
  })

  it('has info method as a function', () => {
    expect(typeof gooeyToast.info).toBe('function')
  })

  it('has promise method as a function', () => {
    expect(typeof gooeyToast.promise).toBe('function')
  })

  it('has dismiss method as a function', () => {
    expect(typeof gooeyToast.dismiss).toBe('function')
  })

  it('has update method as a function', () => {
    expect(typeof gooeyToast.update).toBe('function')
  })
})

describe('gooeyToast.promise', () => {
  const mockCustom = toast.custom as ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockCustom.mockClear()
    _resetQueue()
  })

  it('calls toast.custom when promise is invoked', () => {
    const promise = new Promise(() => {})
    gooeyToast.promise(promise, {
      loading: 'Loading...',
      success: 'Done!',
      error: 'Failed',
    })
    expect(mockCustom).toHaveBeenCalledTimes(1)
    expect(mockCustom).toHaveBeenCalledWith(
      expect.objectContaining({ __name: 'PromiseToastWrapper' }),
      expect.objectContaining({ id: expect.any(String) })
    )
  })

  it('passes Infinity duration when description is provided', () => {
    const promise = new Promise(() => {})
    gooeyToast.promise(promise, {
      loading: 'Loading...',
      success: 'Done!',
      error: 'Failed',
      description: { loading: 'Please wait' },
    })
    expect(mockCustom).toHaveBeenCalledWith(
      expect.objectContaining({ __name: 'PromiseToastWrapper' }),
      expect.objectContaining({ duration: Infinity })
    )
  })

  it('passes Infinity duration when timing.displayDuration is set', () => {
    const promise = new Promise(() => {})
    gooeyToast.promise(promise, {
      loading: 'Loading...',
      success: 'Done!',
      error: 'Failed',
      timing: { displayDuration: 5000 },
    })
    expect(mockCustom).toHaveBeenCalledWith(
      expect.objectContaining({ __name: 'PromiseToastWrapper' }),
      expect.objectContaining({ duration: Infinity })
    )
  })
})

describe('gooeyToast.update', () => {
  const mockCustom = toast.custom as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    mockCustom.mockClear()
    _resetQueue()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing for a non-existent toast ID', () => {
    expect(() => {
      gooeyToast.update('nonexistent-id', { title: 'New title' })
    }).not.toThrow()
  })
})
