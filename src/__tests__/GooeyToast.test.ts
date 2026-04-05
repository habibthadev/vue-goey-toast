import { render, screen, fireEvent } from '@testing-library/vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, h } from 'vue'
import GooeyToast from '../components/GooeyToast.vue'
import { setGooeyTheme, setGooeyDir, setGooeyPosition } from '../context'

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

function mockReducedMotion(enabled: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: enabled,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
}

describe('GooeyToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    setGooeyTheme('light')
  })

  it('renders title text', () => {
    render(GooeyToast, { props: { title: 'Loading...', type: 'success', phase: 'loading' } })
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders in compact pill shape during loading phase', () => {
    const { container } = render(GooeyToast, {
      props: { title: 'Loading...', type: 'success', phase: 'loading' },
    })
    const contentEl = container.querySelector('[class*="content"]') as HTMLElement
    expect(contentEl.className).toContain('Compact')
    expect(contentEl.className).not.toContain('Expanded')
  })

  it('renders in compact pill shape for result without description', () => {
    const { container } = render(GooeyToast, {
      props: { title: 'Done!', type: 'success', phase: 'success' },
    })
    const contentEl = container.querySelector('[class*="content"]') as HTMLElement
    expect(contentEl.className).toContain('Compact')
  })

  it('renders in expanded shape when description is provided', async () => {
    const { container } = render(GooeyToast, {
      props: {
        title: 'Done!',
        description: 'Your file was saved.',
        type: 'success',
        phase: 'success',
      },
    })
    vi.advanceTimersByTime(400)
    await nextTick()
    const contentEl = container.querySelector('[class*="content"]') as HTMLElement
    expect(contentEl.className).toContain('Expanded')
    expect(screen.getByText('Your file was saved.')).toBeInTheDocument()
  })

  it('renders action button when action is provided', async () => {
    const onClick = vi.fn()
    render(GooeyToast, {
      props: {
        title: 'Error',
        description: 'Something went wrong.',
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

  it('calls action onClick when button is clicked', async () => {
    const onClick = vi.fn()
    render(GooeyToast, {
      props: {
        title: 'Error',
        description: 'Something went wrong.',
        type: 'error',
        phase: 'error',
        action: { label: 'Retry', onClick },
      },
    })
    vi.advanceTimersByTime(400)
    await nextTick()
    const button = screen.getByRole('button', { name: 'Retry' })
    await fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not render description when not provided', () => {
    render(GooeyToast, { props: { title: 'Done!', type: 'success', phase: 'success' } })
    const desc = document.querySelector('[class*="description"]')
    expect(desc).toBeNull()
  })

  it('does not render action button when action is not provided', () => {
    render(GooeyToast, { props: { title: 'Done!', type: 'success', phase: 'success' } })
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('allows disabling timestamp with showTimestamp=false', () => {
    render(GooeyToast, {
      props: { title: 'Done!', type: 'success', phase: 'success', showTimestamp: false },
    })
    const timestamp = document.querySelector('[class*="timestamp"]')
    expect(timestamp).toBeNull()
  })

  it('renders timestamp by default', () => {
    render(GooeyToast, { props: { title: 'Done!', type: 'success', phase: 'success' } })
    const timestamp = document.querySelector('[class*="timestamp"]')
    expect(timestamp).toBeInTheDocument()
  })

  it('renders custom icon when provided', () => {
    render(GooeyToast, {
      props: {
        title: 'Custom',
        type: 'info',
        phase: 'info',
        icon: h('span', { 'data-testid': 'custom-icon' }, '*'),
      },
    })
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('renders VNode description', async () => {
    render(GooeyToast, {
      props: {
        title: 'Done!',
        description: h('span', { 'data-testid': 'custom-desc' }, 'Rich content'),
        type: 'success',
        phase: 'success',
      },
    })
    vi.advanceTimersByTime(400)
    await nextTick()
    expect(screen.getByTestId('custom-desc')).toBeInTheDocument()
    expect(screen.getByText('Rich content')).toBeInTheDocument()
  })

  it('applies classNames to wrapper element', () => {
    const { container } = render(GooeyToast, {
      props: {
        title: 'Styled',
        type: 'info',
        phase: 'info',
        classNames: { wrapper: 'my-custom-wrapper' },
      },
    })
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('my-custom-wrapper')
  })

  it('uses custom fillColor for SVG blob', () => {
    const { container } = render(GooeyToast, {
      props: {
        title: 'Dark',
        type: 'info',
        phase: 'info',
        fillColor: '#1a1a2e',
      },
    })
    const path = container.querySelector('svg path')!
    expect(path.getAttribute('fill')).toBe('#1a1a2e')
  })

  it('uses default fillColor when not provided', () => {
    const { container } = render(GooeyToast, {
      props: {
        title: 'Default',
        type: 'info',
        phase: 'info',
      },
    })
    const path = container.querySelector('svg path')!
    expect(path.getAttribute('fill')).toBe('#ffffff')
  })

  describe('ARIA accessibility', () => {
    it('sets role="status" and aria-live="polite" for success toasts', () => {
      const { container } = render(GooeyToast, {
        props: { title: 'Done!', type: 'success', phase: 'success' },
      })
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.getAttribute('role')).toBe('status')
      expect(wrapper.getAttribute('aria-live')).toBe('polite')
      expect(wrapper.getAttribute('aria-atomic')).toBe('true')
    })

    it('sets role="status" and aria-live="polite" for info toasts', () => {
      const { container } = render(GooeyToast, {
        props: { title: 'Info', type: 'info', phase: 'info' },
      })
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.getAttribute('role')).toBe('status')
      expect(wrapper.getAttribute('aria-live')).toBe('polite')
    })

    it('sets role="status" and aria-live="polite" for default toasts', () => {
      const { container } = render(GooeyToast, {
        props: { title: 'Hello', type: 'default', phase: 'default' },
      })
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.getAttribute('role')).toBe('status')
      expect(wrapper.getAttribute('aria-live')).toBe('polite')
    })

    it('sets role="alert" and aria-live="assertive" for error toasts', () => {
      const { container } = render(GooeyToast, {
        props: { title: 'Error!', type: 'error', phase: 'error' },
      })
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.getAttribute('role')).toBe('alert')
      expect(wrapper.getAttribute('aria-live')).toBe('assertive')
      expect(wrapper.getAttribute('aria-atomic')).toBe('true')
    })

    it('sets role="alert" and aria-live="assertive" for warning toasts', () => {
      const { container } = render(GooeyToast, {
        props: { title: 'Warning!', type: 'warning', phase: 'warning' },
      })
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.getAttribute('role')).toBe('alert')
      expect(wrapper.getAttribute('aria-live')).toBe('assertive')
    })

    it('hides SVG blob from screen readers with aria-hidden', () => {
      const { container } = render(GooeyToast, {
        props: { title: 'Done!', type: 'success', phase: 'success' },
      })
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-hidden')).toBe('true')
    })
  })

  describe('prefers-reduced-motion', () => {
    it('expands immediately with no delay when reduced motion is preferred', async () => {
      mockReducedMotion(true)
      const { container } = render(GooeyToast, {
        props: {
          title: 'Done!',
          description: 'Your file was saved.',
          type: 'success',
          phase: 'success',
        },
      })
      vi.advanceTimersByTime(400)
      await nextTick()
      await nextTick()
      const contentEl = container.querySelector('[class*="content"]') as HTMLElement
      expect(contentEl.className).toContain('Expanded')
      expect(screen.getByText('Your file was saved.')).toBeInTheDocument()
    })

    it('still renders title and description correctly with reduced motion', async () => {
      mockReducedMotion(true)
      render(GooeyToast, {
        props: {
          title: 'Info',
          description: 'Details here.',
          type: 'info',
          phase: 'info',
        },
      })
      vi.advanceTimersByTime(400)
      await nextTick()
      await nextTick()
      expect(screen.getByText('Info')).toBeInTheDocument()
      expect(screen.getByText('Details here.')).toBeInTheDocument()
    })

    it('still renders action button with reduced motion', async () => {
      mockReducedMotion(true)
      const onClick = vi.fn()
      render(GooeyToast, {
        props: {
          title: 'Error',
          description: 'Something went wrong.',
          type: 'error',
          phase: 'error',
          action: { label: 'Retry', onClick },
        },
      })
      vi.advanceTimersByTime(400)
      await nextTick()
      await nextTick()
      const button = screen.getByRole('button', { name: 'Retry' })
      expect(button).toBeInTheDocument()
      await fireEvent.click(button)
      expect(onClick).toHaveBeenCalledOnce()
    })

    it('renders compact pill without motion when no description', () => {
      mockReducedMotion(true)
      const { container } = render(GooeyToast, {
        props: { title: 'Done!', type: 'success', phase: 'success' },
      })
      const contentEl = container.querySelector('[class*="content"]') as HTMLElement
      expect(contentEl.className).toContain('Compact')
    })
  })

  describe('dark mode', () => {
    it('uses dark fillColor (#1a1a1a) when theme is dark and no custom fillColor', () => {
      setGooeyTheme('dark')
      const { container } = render(GooeyToast, {
        props: { title: 'Dark', type: 'info', phase: 'info' },
      })
      const path = container.querySelector('svg path')!
      expect(path.getAttribute('fill')).toBe('#1a1a1a')
    })

    it('uses light fillColor (#ffffff) when theme is light and no custom fillColor', () => {
      setGooeyTheme('light')
      const { container } = render(GooeyToast, {
        props: { title: 'Light', type: 'info', phase: 'info' },
      })
      const path = container.querySelector('svg path')!
      expect(path.getAttribute('fill')).toBe('#ffffff')
    })

    it('respects explicit fillColor even in dark mode', () => {
      setGooeyTheme('dark')
      const { container } = render(GooeyToast, {
        props: { title: 'Custom', type: 'info', phase: 'info', fillColor: '#ff0000' },
      })
      const path = container.querySelector('svg path')!
      expect(path.getAttribute('fill')).toBe('#ff0000')
    })
  })

  describe('RTL layout support', () => {
    afterEach(() => {
      setGooeyDir('ltr')
      setGooeyPosition('bottom-right')
    })

    it('flips right-position to left-side visual in RTL mode', () => {
      setGooeyPosition('bottom-right')
      setGooeyDir('rtl')
      const { container } = render(GooeyToast, {
        props: { title: 'RTL Right', type: 'info', phase: 'info' },
      })
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.marginLeft).not.toBe('auto')
      expect(wrapper.style.transform).not.toContain('scaleX(-1)')
    })

    it('flips left-position to right-side visual in RTL mode', () => {
      setGooeyPosition('bottom-left')
      setGooeyDir('rtl')
      const { container } = render(GooeyToast, {
        props: { title: 'RTL Left', type: 'info', phase: 'info' },
      })
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.marginLeft).toBe('auto')
      expect(wrapper.style.transform).toContain('scaleX(-1)')
    })

    it('keeps center position unchanged in RTL mode', () => {
      setGooeyPosition('bottom-center')
      setGooeyDir('rtl')
      const { container } = render(GooeyToast, {
        props: { title: 'RTL Center', type: 'info', phase: 'info' },
      })
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.margin).toBe('0px auto')
    })

    it('does not flip positions in LTR mode', () => {
      setGooeyPosition('bottom-right')
      setGooeyDir('ltr')
      const { container } = render(GooeyToast, {
        props: { title: 'LTR Right', type: 'info', phase: 'info' },
      })
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.style.marginLeft).toBe('auto')
      expect(wrapper.style.transform).toContain('scaleX(-1)')
    })
  })
})
