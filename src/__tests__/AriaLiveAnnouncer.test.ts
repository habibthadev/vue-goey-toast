import { render, screen, waitFor } from '@testing-library/vue'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'
import AriaLiveAnnouncer from '../components/AriaLiveAnnouncer.vue'
import { announce } from '../context'

describe('AriaLiveAnnouncer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders two visually-hidden live regions', () => {
    render(AriaLiveAnnouncer)
    const polite = screen.getByRole('status')
    const assertive = screen.getByRole('alert')
    expect(polite).toBeInTheDocument()
    expect(assertive).toBeInTheDocument()
    expect(polite.getAttribute('aria-live')).toBe('polite')
    expect(assertive.getAttribute('aria-live')).toBe('assertive')
    expect(polite.getAttribute('aria-atomic')).toBe('true')
    expect(assertive.getAttribute('aria-atomic')).toBe('true')
  })

  it('visually hides the live regions', () => {
    render(AriaLiveAnnouncer)
    const polite = screen.getByRole('status')
    expect(polite.style.position).toBe('absolute')
    expect(polite.style.width).toBe('1px')
    expect(polite.style.height).toBe('1px')
    expect(polite.style.overflow).toBe('hidden')
  })

  it('announces polite messages in the status region', async () => {
    render(AriaLiveAnnouncer)
    const polite = screen.getByRole('status')

    announce('File saved successfully', 'polite')
    await nextTick()
    await nextTick()

    await waitFor(() => {
      expect(polite.textContent).toBe('File saved successfully')
    })
  })

  it('announces assertive messages in the alert region', async () => {
    render(AriaLiveAnnouncer)
    const assertive = screen.getByRole('alert')

    announce('Something went wrong', 'assertive')
    await nextTick()
    await nextTick()

    await waitFor(() => {
      expect(assertive.textContent).toBe('Something went wrong')
    })
  })

  it('defaults to polite politeness', async () => {
    render(AriaLiveAnnouncer)
    const polite = screen.getByRole('status')

    announce('Hello world')
    await nextTick()
    await nextTick()

    await waitFor(() => {
      expect(polite.textContent).toBe('Hello world')
    })
  })
})
