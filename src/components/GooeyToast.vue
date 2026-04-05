<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, type VNode, type CSSProperties } from 'vue'
import { animate } from 'motion-v'
import { toast as sonnerToast } from 'vue-sonner'
import type {
  GooeyToastAction,
  GooeyToastClassNames,
  GooeyToastPhase,
  GooeyToastTimings,
  GooeyToastType,
} from '../types'
import type { AnimationPresetName } from '../presets'
import { animationPresets } from '../presets'
import {
  getGooeyPosition,
  getGooeyDir,
  getGooeySpring,
  getGooeyBounce,
  getGooeySwipeToDismiss,
  getGooeyTheme,
  getGooeyShowProgress,
  getGooeyCloseButton,
  subscribeContainerHovered,
  getContainerHovered,
} from '../context'
import { DefaultIcon, SuccessIcon, ErrorIcon, WarningIcon, InfoIcon, SpinnerIcon } from '../icons'
import { useReducedMotion } from '../useReducedMotion'
import { styles } from './gooey-styles'

export interface GooeyToastProps {
  title: string
  description?: VNode | string
  type: GooeyToastType
  action?: GooeyToastAction
  icon?: VNode | string
  phase: GooeyToastPhase
  classNames?: GooeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  timing?: GooeyToastTimings
  preset?: AnimationPresetName
  spring?: boolean
  bounce?: number
  showProgress?: boolean
  showTimestamp?: boolean
  toastId?: string | number
}

const props = withDefaults(defineProps<GooeyToastProps>(), {
  showTimestamp: true,
})

const phaseIconMap: Record<GooeyToastPhase, any> = {
  loading: SpinnerIcon,
  default: DefaultIcon,
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
}

const titleColorMap: Record<GooeyToastPhase, string> = {
  loading: styles.titleLoading,
  default: styles.titleDefault,
  success: styles.titleSuccess,
  error: styles.titleError,
  warning: styles.titleWarning,
  info: styles.titleInfo,
}

const actionColorMap: Record<GooeyToastPhase, string> = {
  loading: styles.actionInfo,
  default: styles.actionDefault,
  success: styles.actionSuccess,
  error: styles.actionError,
  warning: styles.actionWarning,
  info: styles.actionInfo,
}

const progressColorMap: Record<GooeyToastPhase, string> = {
  loading: styles.progressInfo,
  default: styles.progressDefault,
  success: styles.progressSuccess,
  error: styles.progressError,
  warning: styles.progressWarning,
  info: styles.progressInfo,
}

const PH = 34 // pill height constant
const DEFAULT_DISPLAY_DURATION = 4000

// Squish spring config
const DEFAULT_EXPAND_DUR = 0.6
const DEFAULT_COLLAPSE_DUR = 0.9
function squishSpring(durationSec: number, defaultDur: number, bounce = 0.4) {
  const scale = durationSec / defaultDur
  const stiffness = 200 + bounce * 437.5
  const damping = 24 - bounce * 20
  const mass = 0.7 * scale
  return { type: 'spring' as const, stiffness, damping, mass }
}

// Singleton MutationObserver registry
const observerRegistry = new Map<
  Element,
  {
    observer: MutationObserver
    callbacks: Set<() => void>
  }
>()

function registerSonnerObserver(ol: Element, callback: () => void) {
  let entry = observerRegistry.get(ol)
  if (!entry) {
    const callbacks = new Set<() => void>()
    let applying = false
    const observer = new MutationObserver(() => {
      if (applying) return
      applying = true
      requestAnimationFrame(() => {
        callbacks.forEach((cb) => cb())
        requestAnimationFrame(() => {
          applying = false
        })
      })
    })
    observer.observe(ol, {
      attributes: true,
      attributeFilter: ['style', 'data-visible'],
      subtree: true,
      childList: true,
    })
    entry = { observer, callbacks }
    observerRegistry.set(ol, entry)
  }
  entry.callbacks.add(callback)
  return () => {
    entry!.callbacks.delete(callback)
    if (entry!.callbacks.size === 0) {
      entry!.observer.disconnect()
      observerRegistry.delete(ol)
    }
  }
}

function syncSonnerHeights(wrapperEl: HTMLElement | null, includeOffsets = false) {
  if (!wrapperEl) return
  const li = wrapperEl.closest('[data-sonner-toast]') as HTMLElement | null
  if (!li?.parentElement) return

  const ol = li.parentElement
  const toasts = Array.from(ol.querySelectorAll(':scope > [data-sonner-toast]')) as HTMLElement[]

  if (toasts.length === 0) return

  const heights = toasts.map((t) => {
    if (t.getAttribute('data-visible') === 'false') return 0
    const content = t.firstElementChild as HTMLElement | null
    const h = content ? content.getBoundingClientRect().height : 0
    return h > 0 ? h : PH
  })

  const isExpanded = includeOffsets && toasts[0]?.getAttribute('data-expanded') === 'true'
  if (isExpanded) {
    for (const t of toasts) t.style.setProperty('transition', 'none', 'important')
  }

  for (let i = 0; i < toasts.length; i++) {
    toasts[i].style.setProperty('--initial-height', `${heights[i]}px`)
  }

  if (!includeOffsets) {
    if (isExpanded) {
      for (const t of toasts) t.style.removeProperty('transition')
    }
    return
  }

  const gapStr = getComputedStyle(ol).getPropertyValue('--gap').trim()
  const gap = parseFloat(gapStr) || 14

  let runningOffset = 0
  for (let i = toasts.length - 1; i >= 0; i--) {
    if (toasts[i].getAttribute('data-visible') === 'false') {
      toasts[i].style.setProperty('--offset', '0px')
      continue
    }
    toasts[i].style.setProperty('--offset', `${runningOffset}px`)
    if (i > 0) {
      runningOffset += heights[i] + gap
    }
  }

  if (isExpanded) {
    void ol.offsetHeight
    for (const t of toasts) t.style.removeProperty('transition')
  }
}

function memoizePath(fn: (pw: number, bw: number, th: number, t: number) => string) {
  let lastArgs: [number, number, number, number] | null = null
  let lastResult = ''
  return (pw: number, bw: number, th: number, t: number): string => {
    if (
      lastArgs &&
      lastArgs[0] === pw &&
      lastArgs[1] === bw &&
      lastArgs[2] === th &&
      lastArgs[3] === t
    ) {
      return lastResult
    }
    lastResult = fn(pw, bw, th, t)
    lastArgs = [pw, bw, th, t]
    return lastResult
  }
}

function morphPathRaw(pw: number, bw: number, th: number, t: number): string {
  const pr = PH / 2
  const pillW = Math.min(pw, bw)

  const bodyH = PH + (th - PH) * t

  if (t <= 0 || bodyH - PH < 8) {
    return [
      `M 0,${pr}`,
      `A ${pr},${pr} 0 0 1 ${pr},0`,
      `H ${pillW - pr}`,
      `A ${pr},${pr} 0 0 1 ${pillW},${pr}`,
      `A ${pr},${pr} 0 0 1 ${pillW - pr},${PH}`,
      `H ${pr}`,
      `A ${pr},${pr} 0 0 1 0,${pr}`,
      `Z`,
    ].join(' ')
  }

  const curve = 14 * t
  const cr = Math.min(16, (bodyH - PH) * 0.45)
  const bodyW = pillW + (bw - pillW) * t
  const bodyTop = PH - curve
  const qEndX = Math.min(pillW + curve, bodyW - cr)

  return [
    `M 0,${pr}`,
    `A ${pr},${pr} 0 0 1 ${pr},0`,
    `H ${pillW - pr}`,
    `A ${pr},${pr} 0 0 1 ${pillW},${pr}`,
    `L ${pillW},${bodyTop}`,
    `Q ${pillW},${bodyTop + curve} ${qEndX},${bodyTop + curve}`,
    `H ${bodyW - cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyW},${bodyTop + curve + cr}`,
    `L ${bodyW},${bodyH - cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyW - cr},${bodyH}`,
    `H ${cr}`,
    `A ${cr},${cr} 0 0 1 0,${bodyH - cr}`,
    `Z`,
  ].join(' ')
}

function morphPathCenterRaw(pw: number, bw: number, th: number, t: number): string {
  const pr = PH / 2
  const pillW = Math.min(pw, bw)

  const pillOffset = (bw - pillW) / 2

  if (t <= 0 || PH + (th - PH) * t - PH < 8) {
    return [
      `M ${pillOffset},${pr}`,
      `A ${pr},${pr} 0 0 1 ${pillOffset + pr},0`,
      `H ${pillOffset + pillW - pr}`,
      `A ${pr},${pr} 0 0 1 ${pillOffset + pillW},${pr}`,
      `A ${pr},${pr} 0 0 1 ${pillOffset + pillW - pr},${PH}`,
      `H ${pillOffset + pr}`,
      `A ${pr},${pr} 0 0 1 ${pillOffset},${pr}`,
      `Z`,
    ].join(' ')
  }

  const bodyH = PH + (th - PH) * t
  const curve = 14 * t
  const cr = Math.min(16, (bodyH - PH) * 0.45)
  const bodyTop = PH - curve

  const bodyCenter = bw / 2
  const halfBodyW = pillW / 2 + ((bw - pillW) / 2) * t
  const bodyLeft = bodyCenter - halfBodyW
  const bodyRight = bodyCenter + halfBodyW

  const qLeftX = Math.max(bodyLeft + cr, pillOffset - curve)
  const qRightX = Math.min(bodyRight - cr, pillOffset + pillW + curve)

  return [
    `M ${pillOffset},${pr}`,
    `A ${pr},${pr} 0 0 1 ${pillOffset + pr},0`,
    `H ${pillOffset + pillW - pr}`,
    `A ${pr},${pr} 0 0 1 ${pillOffset + pillW},${pr}`,
    `L ${pillOffset + pillW},${bodyTop}`,
    `Q ${pillOffset + pillW},${bodyTop + curve} ${qRightX},${bodyTop + curve}`,
    `H ${bodyRight - cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyRight},${bodyTop + curve + cr}`,
    `L ${bodyRight},${bodyH - cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyRight - cr},${bodyH}`,
    `H ${bodyLeft + cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyLeft},${bodyH - cr}`,
    `L ${bodyLeft},${bodyTop + curve + cr}`,
    `A ${cr},${cr} 0 0 1 ${bodyLeft + cr},${bodyTop + curve}`,
    `H ${qLeftX}`,
    `Q ${pillOffset},${bodyTop + curve} ${pillOffset},${bodyTop}`,
    `Z`,
  ].join(' ')
}

const morphPath = memoizePath(morphPathRaw)
const morphPathCenter = memoizePath(morphPathCenterRaw)

const SMOOTH_EASE = [0.4, 0, 0.2, 1] as const

// State
const theme = getGooeyTheme()
const closeButtonSetting = getGooeyCloseButton()
const showCloseButton = closeButtonSetting !== false
const fillColor = computed(() => props.fillColor ?? (theme === 'dark' ? '#1a1a1a' : '#ffffff'))
const position = getGooeyPosition()
const dir = getGooeyDir()
const posIsRight = position?.includes('right') ?? false
const isCenter = position?.includes('center') ?? false
const isRight = dir === 'rtl' ? (isCenter ? false : !posIsRight) : posIsRight
const prefersReducedMotion = useReducedMotion()

const presetConfig = computed(() => (props.preset ? animationPresets[props.preset] : undefined))
const useSpring = computed(() => props.spring ?? presetConfig.value?.spring ?? getGooeySpring())
const bounceVal = computed(
  () => props.bounce ?? presetConfig.value?.bounce ?? getGooeyBounce() ?? 0.4
)
const showProgress = computed(() => props.showProgress ?? getGooeyShowProgress())

const actionSuccess = ref<string | null>(null)
const dismissing = ref(false)
const progressKey = ref(0)
const hovered = ref(false)
const hoveredRef = ref(false)
const containerHoveredRef = ref(getContainerHovered())
const containerHovered = ref(getContainerHovered())
const collapsingRef = ref(false)
const preDismissRef = ref(false)
const collapseEndTime = ref(0)
const expandedDimsRef = ref({ pw: 0, bw: 0, th: 0 })
const dismissTimerRef = ref<ReturnType<typeof setTimeout> | null>(null)

const effectiveTitle = computed(() => actionSuccess.value ?? props.title)
const effectivePhase = computed<GooeyToastPhase>(() =>
  actionSuccess.value ? 'success' : props.phase
)
const effectiveDescription = computed(() => (actionSuccess.value ? undefined : props.description))
const effectiveAction = computed(() => (actionSuccess.value ? undefined : props.action))

const isLoading = computed(() => effectivePhase.value === 'loading')
const hasDescription = computed(() => Boolean(effectiveDescription.value))
const hasAction = computed(() => Boolean(effectiveAction.value))
const isExpanded = computed(() => (hasDescription.value || hasAction.value) && !dismissing.value)

const showBody = ref(false)

// DOM refs
const wrapperRef = ref<HTMLDivElement | null>(null)
const pathRef = ref<SVGPathElement | null>(null)
const headerRef = ref<HTMLDivElement | null>(null)
const contentRef = ref<HTMLDivElement | null>(null)

// Animation controllers
const morphCtrl = ref<ReturnType<typeof animate> | null>(null)
const pillResizeCtrl = ref<ReturnType<typeof animate> | null>(null)
const headerSquishCtrl = ref<ReturnType<typeof animate> | null>(null)

// Animated state
const morphTRef = ref(0)
const aDims = ref({ pw: 0, bw: 0, th: 0 })
const dimsRef = ref({ pw: 0, bw: 0, th: 0 })

const dims = ref({ pw: 0, bw: 0, th: 0 })
watch(dims, (newDims) => {
  dimsRef.value = newDims
})

// Subscribe to container-level hover
onMounted(() => {
  const unsubscribe = subscribeContainerHovered((h) => {
    containerHoveredRef.value = h
    containerHovered.value = h
  })
  onUnmounted(unsubscribe)
})

// Push current animated state to SVG DOM
const flush = () => {
  const { pw: p, bw: b, th: h } = aDims.value
  if (p <= 0 || b <= 0 || h <= 0) return
  const t = Math.max(0, Math.min(1, morphTRef.value))
  const pos = getGooeyPosition()
  const d = getGooeyDir()
  const centerPos = pos?.includes('center') ?? false
  const posRight = pos?.includes('right') ?? false
  const rightSide = d === 'rtl' ? (centerPos ? false : !posRight) : posRight

  if (centerPos) {
    const centerBw = Math.max(dimsRef.value.bw, expandedDimsRef.value.bw, p)
    pathRef.value?.setAttribute('d', morphPathCenter(p, centerBw, h, t))
  } else {
    pathRef.value?.setAttribute('d', morphPath(p, b, h, t))
  }

  if (t >= 1) {
    if (wrapperRef.value) {
      wrapperRef.value.style.width = ''
    }
    if (contentRef.value) {
      contentRef.value.style.width = ''
      contentRef.value.style.overflow = ''
      contentRef.value.style.maxHeight = ''
      contentRef.value.style.clipPath = ''
    }
  } else if (t > 0) {
    const targetBw = dimsRef.value.bw
    const targetTh = dimsRef.value.th
    const pillW = Math.min(p, b)
    const currentW = pillW + (b - pillW) * t
    const currentH = PH + (targetTh - PH) * t
    const centerFullW = centerPos ? Math.max(dimsRef.value.bw, expandedDimsRef.value.bw, p) : 0
    if (wrapperRef.value) {
      wrapperRef.value.style.width = (centerPos ? centerFullW : currentW) + 'px'
    }
    if (contentRef.value) {
      contentRef.value.style.width = (centerPos ? centerFullW : targetBw) + 'px'
      contentRef.value.style.overflow = 'hidden'
      contentRef.value.style.maxHeight = currentH + 'px'
      if (centerPos) {
        const clip = (centerFullW - currentW) / 2
        contentRef.value.style.clipPath = `inset(0 ${clip}px 0 ${clip}px)`
      } else {
        const clip = targetBw - currentW
        contentRef.value.style.clipPath = rightSide
          ? `inset(0 0 0 ${clip}px)`
          : `inset(0 ${clip}px 0 0)`
      }
    }
  } else {
    const pillW = Math.min(p, b)
    if (wrapperRef.value) {
      const centerBw = centerPos ? Math.max(dimsRef.value.bw, expandedDimsRef.value.bw, p) : pillW
      wrapperRef.value.style.width = centerBw + 'px'
    }
    if (contentRef.value) {
      if (centerPos) {
        const centerBwVal = Math.max(dimsRef.value.bw, expandedDimsRef.value.bw, p)
        contentRef.value.style.width = centerBwVal + 'px'
        const clip = (centerBwVal - pillW) / 2
        contentRef.value.style.clipPath = `inset(0 ${clip}px 0 ${clip}px)`
      } else {
        contentRef.value.style.width = ''
        contentRef.value.style.clipPath = ''
      }
      contentRef.value.style.overflow = 'hidden'
      contentRef.value.style.maxHeight = PH + 'px'
    }
  }
}

// Measure content dimensions
const measure = () => {
  if (!headerRef.value || !contentRef.value) return
  const wr = wrapperRef.value
  const savedW = wr?.style.width ?? ''
  const savedOv = contentRef.value.style.overflow
  const savedMH = contentRef.value.style.maxHeight
  const savedCW = contentRef.value.style.width
  if (wr) {
    wr.style.width = ''
  }
  contentRef.value.style.overflow = ''
  contentRef.value.style.maxHeight = ''
  contentRef.value.style.width = ''

  const cs = getComputedStyle(contentRef.value)
  const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
  const pw = headerRef.value.offsetWidth + paddingX
  const bw = contentRef.value.offsetWidth
  const th = contentRef.value.offsetHeight

  if (wr) {
    wr.style.width = savedW
  }
  contentRef.value.style.overflow = savedOv
  contentRef.value.style.maxHeight = savedMH
  contentRef.value.style.width = savedCW

  dimsRef.value = { pw, bw, th }
  dims.value = { pw, bw, th }
}

// Measure on prop changes
watch(
  [effectiveTitle, effectivePhase, isExpanded, showBody, effectiveDescription, effectiveAction],
  () => {
    measure()
    const t = setTimeout(measure, 100)
    onUnmounted(() => clearTimeout(t))
  },
  { immediate: false }
)

onMounted(() => {
  measure()
  const t = setTimeout(measure, 100)
  onUnmounted(() => clearTimeout(t))

  if (contentRef.value) {
    const ro = new ResizeObserver(measure)
    ro.observe(contentRef.value)
    onUnmounted(() => ro.disconnect())
  }
})

const hasDims = computed(() => dims.value.pw > 0 && dims.value.bw > 0 && dims.value.th > 0)

// Squish animation controller
const blobSquishCtrl = ref<ReturnType<typeof animate> | null>(null)

const expandDur = DEFAULT_EXPAND_DUR
const collapseDur = DEFAULT_COLLAPSE_DUR
const lastSquishTime = ref(0)
const triggerLandingSquish = (phase: 'expand' | 'collapse' | 'mount' = 'mount') => {
  if (!wrapperRef.value || prefersReducedMotion.value) return
  if (!useSpring.value) return
  const now = Date.now()
  if (now - lastSquishTime.value < 300) return
  lastSquishTime.value = now
  blobSquishCtrl.value?.stop()
  const el = wrapperRef.value
  const springConfig =
    phase === 'collapse'
      ? squishSpring(collapseDur, DEFAULT_COLLAPSE_DUR, bounceVal.value)
      : squishSpring(expandDur, DEFAULT_EXPAND_DUR, bounceVal.value)
  const bScale = bounceVal.value / 0.4
  const compressY = (phase === 'collapse' ? 0.035 : 0.12) * bScale
  const expandX = (phase === 'collapse' ? 0.018 : 0.06) * bScale
  blobSquishCtrl.value = animate(0, 1, {
    ...springConfig,
    onUpdate: (v) => {
      const intensity = Math.sin(v * Math.PI)
      const sy = 1 - compressY * intensity
      const sx = 1 + expandX * intensity
      const mirror = el.style.transform?.includes('scaleX(-1)') ? 'scaleX(-1) ' : ''
      el.style.transformOrigin = 'center top'
      el.style.transform = mirror + `scaleX(${sx}) scaleY(${sy})`
    },
    onComplete: () => {
      const right = el.style.transform?.includes('scaleX(-1)')
      el.style.transform = right ? 'scaleX(-1)' : ''
      el.style.transformOrigin = ''
    },
  })
}

// Handle dims changes
watch(
  [() => dims.value.pw, () => dims.value.bw, () => dims.value.th, hasDims, showBody],
  ([newPw, newBw, newTh, newHasDims, newShowBody]) => {
    if (!newHasDims || collapsingRef.value) return

    const prev = { ...aDims.value }
    const target = { pw: newPw, bw: newBw, th: newTh }

    if (prev.bw <= 0) {
      aDims.value = target
      flush()
      return
    }

    if (morphTRef.value > 0 && morphTRef.value < 1) {
      aDims.value = target
      flush()
      return
    }

    if (newShowBody) {
      aDims.value = target
      flush()
      return
    }

    if (prev.bw === target.bw && prev.pw === target.pw && prev.th === target.th) return

    if (prefersReducedMotion.value) {
      aDims.value = target
      flush()
      return
    }

    pillResizeCtrl.value?.stop()
    if (Date.now() - collapseEndTime.value > 500 && !isExpanded.value) {
      triggerLandingSquish('expand')
    }
    const pillResizeTransition = useSpring.value
      ? { type: 'spring' as const, duration: 0.5, bounce: bounceVal.value * 0.875 }
      : { duration: 0.4, ease: SMOOTH_EASE }
    pillResizeCtrl.value = animate(0, 1, {
      ...pillResizeTransition,
      onUpdate: (t) => {
        aDims.value = {
          pw: prev.pw + (target.pw - prev.pw) * t,
          bw: prev.bw + (target.bw - prev.bw) * t,
          th: prev.th + (target.th - prev.th) * t,
        }
        flush()
      },
    })
  },
  { immediate: true }
)

// Squish on entry
const squishDelayMs = 45
const mountSquished = ref(false)
watch([hasDims, isExpanded], ([newHasDims, newIsExpanded]) => {
  if (newHasDims && !mountSquished.value && !newIsExpanded) {
    mountSquished.value = true
    const t = setTimeout(() => triggerLandingSquish(), squishDelayMs)
    onUnmounted(() => clearTimeout(t))
  }
})

// Squish on expand
const prevShowBody = ref(false)
watch(showBody, (newShowBody) => {
  if (!prevShowBody.value && newShowBody && !hoveredRef.value) {
    const t = setTimeout(() => triggerLandingSquish('expand'), 80)
    onUnmounted(() => clearTimeout(t))
  }
  prevShowBody.value = newShowBody
})

// Error shake
const shakeCtrl = ref<ReturnType<typeof animate> | null>(null)
const prevPhase = ref(props.phase)
watch(
  () => props.phase,
  (newPhase) => {
    if (
      newPhase === 'error' &&
      prevPhase.value !== 'error' &&
      !dismissing.value &&
      wrapperRef.value &&
      !prefersReducedMotion.value
    ) {
      shakeCtrl.value?.stop()
      const el = wrapperRef.value
      const mirror = el.style.transform?.includes('scaleX(-1)') ? 'scaleX(-1) ' : ''
      shakeCtrl.value = animate(0, 1, {
        duration: 0.4,
        ease: 'easeOut',
        onUpdate: (v) => {
          const decay = 1 - v
          const shake = Math.sin(v * Math.PI * 6) * decay * 3
          el.style.transform = mirror + `translateX(${shake}px)`
        },
        onComplete: () => {
          el.style.transform = mirror.trim() || ''
        },
      })
    }
    prevPhase.value = newPhase
  }
)
onUnmounted(() => {
  shakeCtrl.value?.stop()
})

// Phase 1: expand or collapse
let expandTimeout: ReturnType<typeof setTimeout> | null = null
watch(
  isExpanded,
  (newIsExpanded) => {
    if (expandTimeout) {
      clearTimeout(expandTimeout)
      expandTimeout = null
    }

    if (newIsExpanded) {
      const delay = prefersReducedMotion.value ? 0 : 330
      expandTimeout = setTimeout(() => (showBody.value = true), delay)
      return
    }

    morphCtrl.value?.stop()
    pillResizeCtrl.value?.stop()

    if (morphTRef.value > 0) {
      const csPad = contentRef.value ? getComputedStyle(contentRef.value) : null
      const padX = csPad ? parseFloat(csPad.paddingLeft) + parseFloat(csPad.paddingRight) : 20
      const targetPw = headerRef.value ? headerRef.value.offsetWidth + padX : aDims.value.pw
      const targetDims = { pw: targetPw, bw: targetPw, th: PH }

      if (prefersReducedMotion.value) {
        morphTRef.value = 0
        collapsingRef.value = false
        preDismissRef.value = false
        showBody.value = false
        aDims.value = { ...targetDims }
        flush()
        return
      }

      const savedDims =
        expandedDimsRef.value.bw > 0 ? { ...expandedDimsRef.value } : { ...aDims.value }

      const isPreDismiss = preDismissRef.value
      const collapseDurVal = 0.9
      const collapseTransition =
        isPreDismiss || !useSpring.value
          ? { duration: collapseDurVal, ease: SMOOTH_EASE }
          : { type: 'spring' as const, duration: collapseDurVal, bounce: bounceVal.value * 0.875 }

      triggerLandingSquish('collapse')

      morphCtrl.value = animate(morphTRef.value, 0, {
        ...collapseTransition,
        onUpdate: (t) => {
          morphTRef.value = t
          aDims.value = {
            pw: targetDims.pw + (savedDims.pw - targetDims.pw) * t,
            bw: targetDims.bw + (savedDims.bw - targetDims.bw) * t,
            th: targetDims.th + (savedDims.th - targetDims.th) * t,
          }
          flush()
          syncSonnerHeights(wrapperRef.value, true)
        },
        onComplete: () => {
          morphTRef.value = 0
          collapsingRef.value = false
          preDismissRef.value = false
          collapseEndTime.value = Date.now()
          aDims.value = { ...targetDims }
          flush()
          syncSonnerHeights(wrapperRef.value, true)
          showBody.value = false
        },
      })
      return
    }

    showBody.value = false
    morphTRef.value = 0
    flush()
  },
  { immediate: true }
)
onUnmounted(() => {
  if (expandTimeout) clearTimeout(expandTimeout)
})

// Pre-dismiss collapse
const remainingRef = ref<number | null>(null)
const timerStartRef = ref(0)
const progressDelayRef = ref(0)
let preDismissTimer: ReturnType<typeof setTimeout> | null = null

const cleanupPreDismissTimer = () => {
  if (preDismissTimer) {
    clearTimeout(preDismissTimer)
    const elapsed = Date.now() - timerStartRef.value
    const delay = remainingRef.value ?? props.timing?.displayDuration ?? DEFAULT_DISPLAY_DURATION
    const remaining = delay - elapsed
    if (remaining > 0 && (hoveredRef.value || containerHoveredRef.value)) {
      remainingRef.value = remaining
    }
    preDismissTimer = null
  }
}

watch(
  [showBody, actionSuccess, dismissing, hovered, containerHovered],
  ([newShowBody, newActionSuccess, newDismissing, _newHovered, _newContainerHovered]) => {
    cleanupPreDismissTimer()

    if (!newShowBody || newActionSuccess || newDismissing) return

    const expandDelayMs = prefersReducedMotion.value ? 0 : 330
    const collapseMs = prefersReducedMotion.value ? 10 : 0.9 * 1000
    const displayMs = props.timing?.displayDuration ?? DEFAULT_DISPLAY_DURATION
    const fullDelay = displayMs - expandDelayMs - collapseMs
    progressDelayRef.value = Math.max(fullDelay, 0)
    if (fullDelay <= 0) return

    if (hoveredRef.value || containerHoveredRef.value) return

    const delay = remainingRef.value ?? fullDelay
    timerStartRef.value = Date.now()

    preDismissTimer = setTimeout(() => {
      if (hoveredRef.value || containerHoveredRef.value) {
        const elapsed = Date.now() - timerStartRef.value
        remainingRef.value = Math.max(0, delay - elapsed)
        return
      }
      remainingRef.value = null
      expandedDimsRef.value = { ...aDims.value }
      collapsingRef.value = true
      preDismissRef.value = true
      dismissing.value = true
    }, delay)
    dismissTimerRef.value = preDismissTimer
  }
)
onUnmounted(cleanupPreDismissTimer)

// Re-expand on hover
const canExpand = computed(() => hasDescription.value || hasAction.value)
const reExpandingRef = ref(false)
let reExpandRaf: number | null = null

watch(
  [() => hovered.value, () => containerHovered.value, dismissing, canExpand],
  ([newHovered, newContainerHovered, newDismissing, newCanExpand]) => {
    if (reExpandRaf) {
      cancelAnimationFrame(reExpandRaf)
      reExpandRaf = null
    }

    if ((!newHovered && !newContainerHovered) || !newCanExpand || !newDismissing) return

    morphCtrl.value?.stop()
    collapsingRef.value = false
    preDismissRef.value = false
    remainingRef.value = null
    reExpandingRef.value = true
    dismissing.value = false
    showBody.value = true
    if (showProgress.value) progressKey.value = progressKey.value + 1

    const currentT = morphTRef.value
    const startDims = { ...aDims.value }
    const morphExpandTransition = useSpring.value
      ? { type: 'spring' as const, duration: 0.9, bounce: bounceVal.value }
      : { duration: 0.6, ease: SMOOTH_EASE }

    reExpandRaf = requestAnimationFrame(() => {
      morphCtrl.value = animate(currentT, 1, {
        ...morphExpandTransition,
        onUpdate: (t) => {
          morphTRef.value = t
          const target = dimsRef.value
          aDims.value = {
            pw: startDims.pw + (target.pw - startDims.pw) * t,
            bw: startDims.bw + (target.bw - startDims.bw) * t,
            th: startDims.th + (target.th - startDims.th) * t,
          }
          flush()
          syncSonnerHeights(wrapperRef.value, true)
        },
        onComplete: () => {
          morphTRef.value = 1
          aDims.value = { ...dimsRef.value }
          reExpandingRef.value = false
          flush()
          syncSonnerHeights(wrapperRef.value, true)
        },
      })
    })
  }
)
onUnmounted(() => {
  if (reExpandRaf) cancelAnimationFrame(reExpandRaf)
  morphCtrl.value?.stop()
})

// Dismiss from Sonner after collapse completes
let dismissSonnerTimer: ReturnType<typeof setTimeout> | null = null
watch([dismissing, showBody, () => props.toastId], ([newDismissing, newShowBody, newToastId]) => {
  if (dismissSonnerTimer) {
    clearTimeout(dismissSonnerTimer)
    dismissSonnerTimer = null
  }
  if (!newToastId || !newDismissing || newShowBody) return
  dismissSonnerTimer = setTimeout(() => {
    if (!hoveredRef.value && !containerHoveredRef.value) {
      sonnerToast.dismiss(newToastId)
    }
  }, 800)
})
onUnmounted(() => {
  if (dismissSonnerTimer) clearTimeout(dismissSonnerTimer)
})

// Dismiss after action success
let actionSuccessTimer: ReturnType<typeof setTimeout> | null = null
watch(
  [actionSuccess, showBody, () => props.toastId],
  ([newActionSuccess, newShowBody, newToastId]) => {
    if (actionSuccessTimer) {
      clearTimeout(actionSuccessTimer)
      actionSuccessTimer = null
    }
    if (!newToastId || !newActionSuccess || newShowBody) return
    actionSuccessTimer = setTimeout(() => sonnerToast.dismiss(newToastId), 1200)
  }
)
onUnmounted(() => {
  if (actionSuccessTimer) clearTimeout(actionSuccessTimer)
})

// Phase 2: morph from pill to blob
watch(showBody, (newShowBody) => {
  if (reExpandingRef.value) return
  if (!newShowBody) {
    morphTRef.value = 0
    morphCtrl.value?.stop()
    flush()
    return
  }

  if (prefersReducedMotion.value) {
    pillResizeCtrl.value?.stop()
    morphCtrl.value?.stop()
    morphTRef.value = 1
    aDims.value = { ...dimsRef.value }
    flush()
    syncSonnerHeights(wrapperRef.value, true)
    return
  }

  const _raf = requestAnimationFrame(() => {
    pillResizeCtrl.value?.stop()
    morphCtrl.value?.stop()
    const startDims = { ...aDims.value }
    const morphExpandTransition = useSpring.value
      ? { type: 'spring' as const, duration: 0.9, bounce: bounceVal.value }
      : { duration: 0.6, ease: SMOOTH_EASE }
    morphCtrl.value = animate(0, 1, {
      ...morphExpandTransition,
      onUpdate: (t) => {
        morphTRef.value = t
        const target = dimsRef.value
        aDims.value = {
          pw: startDims.pw + (target.pw - startDims.pw) * t,
          bw: startDims.bw + (target.bw - startDims.bw) * t,
          th: startDims.th + (target.th - startDims.th) * t,
        }
        flush()
        syncSonnerHeights(wrapperRef.value, true)
      },
      onComplete: () => {
        morphTRef.value = 1
        aDims.value = { ...dimsRef.value }
        flush()
        syncSonnerHeights(wrapperRef.value, true)
      },
    })
  })
})

// Phase 2: morph from pill to blob
let morphRaf: number | null = null
watch(showBody, (newShowBody) => {
  if (morphRaf) {
    cancelAnimationFrame(morphRaf)
    morphRaf = null
  }

  if (reExpandingRef.value) return
  if (!newShowBody) {
    morphTRef.value = 0
    morphCtrl.value?.stop()
    flush()
    return
  }

  if (prefersReducedMotion.value) {
    pillResizeCtrl.value?.stop()
    morphCtrl.value?.stop()
    morphTRef.value = 1
    aDims.value = { ...dimsRef.value }
    flush()
    syncSonnerHeights(wrapperRef.value, true)
    return
  }

  morphRaf = requestAnimationFrame(() => {
    pillResizeCtrl.value?.stop()
    morphCtrl.value?.stop()
    const startDims = { ...aDims.value }
    const morphExpandTransition = useSpring.value
      ? { type: 'spring' as const, duration: 0.9, bounce: bounceVal.value }
      : { duration: 0.6, ease: SMOOTH_EASE }
    morphCtrl.value = animate(0, 1, {
      ...morphExpandTransition,
      onUpdate: (t) => {
        morphTRef.value = t
        const target = dimsRef.value
        aDims.value = {
          pw: startDims.pw + (target.pw - startDims.pw) * t,
          bw: startDims.bw + (target.bw - startDims.bw) * t,
          th: startDims.th + (target.th - startDims.th) * t,
        }
        flush()
        syncSonnerHeights(wrapperRef.value, true)
      },
      onComplete: () => {
        morphTRef.value = 1
        aDims.value = { ...dimsRef.value }
        flush()
        syncSonnerHeights(wrapperRef.value, true)
      },
    })
  })
})
onUnmounted(() => {
  if (morphRaf) cancelAnimationFrame(morphRaf)
  morphCtrl.value?.stop()
})

// Header elastic squish
const headerSquished = ref(false)
watch([showBody, dismissing, actionSuccess], ([newShowBody, newDismissing, newActionSuccess]) => {
  if (!headerRef.value || prefersReducedMotion.value) return
  headerSquishCtrl.value?.stop()
  const el = headerRef.value

  if (newShowBody && !newDismissing && !newActionSuccess) {
    if (!useSpring.value) return
    headerSquished.value = true
    headerSquishCtrl.value = animate(0, 1, {
      ...squishSpring(expandDur, DEFAULT_EXPAND_DUR, bounceVal.value),
      onUpdate: (v) => {
        const scale = 1 - 0.05 * v
        const pushY = v * 1
        el.style.transform = `scale(${scale}) translateY(${pushY}px)`
      },
    })
  } else if (headerSquished.value) {
    headerSquished.value = false
    const isSpringCollapse = !preDismissRef.value && useSpring.value
    const transition = isSpringCollapse
      ? squishSpring(collapseDur, DEFAULT_COLLAPSE_DUR, bounceVal.value)
      : { duration: collapseDur * 0.5, ease: SMOOTH_EASE }
    headerSquishCtrl.value = animate(1, 0, {
      ...transition,
      onUpdate: (v) => {
        const scale = 1 - 0.05 * v
        const pushY = v * 1
        el.style.transform = `scale(${scale}) translateY(${pushY}px)`
      },
      onComplete: () => {
        el.style.transform = ''
      },
    })
  }
})
onUnmounted(() => {
  headerSquishCtrl.value?.stop()
})

// Keep Sonner's toast stacking in sync
onMounted(() => {
  const wrapper = wrapperRef.value
  if (!wrapper) return
  const ol = wrapper.closest('[data-sonner-toast]')?.parentElement
  if (!ol) return

  const unregister = registerSonnerObserver(ol, () => {
    syncSonnerHeights(wrapper, true)
  })

  const expandObs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (
        m.type === 'attributes' &&
        m.attributeName === 'data-expanded' &&
        (m.target as HTMLElement).getAttribute('data-expanded') === 'true'
      ) {
        syncSonnerHeights(wrapper, true)
        break
      }
    }
  })
  expandObs.observe(ol, {
    attributes: true,
    attributeFilter: ['data-expanded'],
    subtree: true,
  })

  onUnmounted(() => {
    unregister()
    expandObs.disconnect()
  })
})

// Action button handler
const handleActionClick = () => {
  if (!effectiveAction.value) return
  if (effectiveAction.value.successLabel) {
    expandedDimsRef.value = { ...aDims.value }
    collapsingRef.value = true
    actionSuccess.value = effectiveAction.value.successLabel
  }
  try {
    effectiveAction.value.onClick()
  } catch {
    /* onClick errors shouldn't block morph-back */
  }
}

// Swipe-to-dismiss touch gesture
const SWIPE_THRESHOLD = 100
const swipeStartRef = ref<{ x: number; y: number } | null>(null)
const swipeOffsetX = ref(0)
const isSwipingRef = ref(false)

const handleTouchStart = (e: TouchEvent) => {
  if (!getGooeySwipeToDismiss()) return
  const touch = e.touches[0]
  swipeStartRef.value = { x: touch.clientX, y: touch.clientY }
  isSwipingRef.value = false
}

const handleTouchMove = (e: TouchEvent) => {
  if (!swipeStartRef.value || !getGooeySwipeToDismiss()) return
  const touch = e.touches[0]
  const dx = touch.clientX - swipeStartRef.value.x
  const dy = touch.clientY - swipeStartRef.value.y

  if (!isSwipingRef.value && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
    swipeStartRef.value = null
    return
  }

  if (!isSwipingRef.value && Math.abs(dx) > 10) {
    isSwipingRef.value = true
  }

  if (isSwipingRef.value) {
    swipeOffsetX.value = dx
  }
}

const handleTouchEnd = () => {
  if (!getGooeySwipeToDismiss()) {
    swipeStartRef.value = null
    return
  }
  if (isSwipingRef.value && Math.abs(swipeOffsetX.value) >= SWIPE_THRESHOLD && props.toastId) {
    sonnerToast.dismiss(props.toastId)
  }
  swipeStartRef.value = null
  isSwipingRef.value = false
  swipeOffsetX.value = 0
}

const swipeOpacity = computed(() =>
  swipeOffsetX.value !== 0
    ? Math.max(0, 1 - Math.abs(swipeOffsetX.value) / (SWIPE_THRESHOLD * 1.5))
    : 1
)
const swipeTranslate = computed(() =>
  swipeOffsetX.value !== 0 ? `translateX(${swipeOffsetX.value}px)` : ''
)

const renderIcon = () => {
  if (!actionSuccess.value && props.icon) return props.icon
  if (isLoading.value) return SpinnerIcon
  return phaseIconMap[effectivePhase.value]
}

const createdAtRef = ref(new Date())
const timestampStr = computed(() =>
  createdAtRef.value.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
)

const basePositionStyle = computed<CSSProperties>(() =>
  isCenter ? { margin: '0 auto' } : isRight ? { marginLeft: 'auto', transform: 'scaleX(-1)' } : {}
)

const wrapperStyle = computed<CSSProperties | undefined>(() => {
  if (swipeTranslate.value) {
    return {
      ...basePositionStyle.value,
      transform:
        (basePositionStyle.value.transform ? basePositionStyle.value.transform + ' ' : '') +
        swipeTranslate.value,
      opacity: swipeOpacity.value,
      transition: 'none',
    }
  }
  return Object.keys(basePositionStyle.value).length > 0 ? basePositionStyle.value : undefined
})

const contentStyle = computed<CSSProperties>(() =>
  isCenter
    ? { textAlign: 'center' }
    : isRight
      ? { transform: 'scaleX(-1)', textAlign: 'right' }
      : { textAlign: 'left' }
)

const handleMouseEnter = () => {
  hoveredRef.value = true
  hovered.value = true
}

const handleMouseLeave = () => {
  hoveredRef.value = false
  hovered.value = false
}
</script>

<template>
  <div
    ref="wrapperRef"
    :class="`${styles.wrapper}${classNames?.wrapper ? ` ${classNames.wrapper}` : ''}`"
    :style="wrapperStyle"
    :role="effectivePhase === 'error' || effectivePhase === 'warning' ? 'alert' : 'status'"
    :aria-live="effectivePhase === 'error' || effectivePhase === 'warning' ? 'assertive' : 'polite'"
    aria-atomic="true"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    :data-center="isCenter || undefined"
    :data-theme="theme"
  >
    <!-- SVG background -->
    <svg :class="styles.blobSvg" aria-hidden="true">
      <path
        ref="pathRef"
        :fill="fillColor"
        :stroke="borderColor || 'none'"
        :stroke-width="borderColor ? (borderWidth ?? 1.5) : 0"
      />
    </svg>

    <!-- Close button -->
    <button
      v-if="showCloseButton && effectivePhase !== 'loading'"
      :class="`${styles.closeButton}${(isRight ? closeButtonSetting !== 'top-right' : closeButtonSetting === 'top-right') ? ` ${styles.closeButtonRight}` : ''}`"
      aria-label="Close toast"
      type="button"
      :style="{
        background: fillColor,
        borderColor: borderColor || 'transparent',
        borderWidth: borderColor ? (borderWidth ?? 1.5) : 0,
        boxShadow: borderColor ? 'none' : '0 1px 4px rgba(0, 0, 0, 0.2)',
        ...(isCenter && closeButtonSetting !== 'top-right' ? { top: '6px', left: '-1px' } : {}),
      }"
      @click.stop="
        () => {
          const id = toastId
          if (id != null) sonnerToast.dismiss(id)
        }
      "
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>

    <!-- Content -->
    <div
      ref="contentRef"
      :class="`${styles.content} ${showBody ? styles.contentExpanded : styles.contentCompact}${classNames?.content ? ` ${classNames.content}` : ''}`"
      :style="contentStyle"
    >
      <div
        ref="headerRef"
        :class="`${styles.header} ${titleColorMap[effectivePhase]}${classNames?.header ? ` ${classNames.header}` : ''}`"
      >
        <div :class="`${styles.iconWrapper}${classNames?.icon ? ` ${classNames.icon}` : ''}`">
          <Transition name="gooey-icon" mode="out-in">
            <div :key="isLoading ? 'spinner' : effectivePhase">
              <component
                :is="renderIcon()"
                :size="18"
                :class="isLoading ? styles.spinnerSpin : ''"
              />
            </div>
          </Transition>
        </div>
        <span :class="`${styles.title}${classNames?.title ? ` ${classNames.title}` : ''}`">{{
          effectiveTitle
        }}</span>
        <span
          v-if="!hasDescription && !hasAction && !actionSuccess && showTimestamp"
          :class="styles.timestamp"
          >{{ timestampStr }}</span
        >
      </div>

      <Transition name="gooey-fade">
        <div
          v-if="showBody && hasDescription && !dismissing"
          key="description"
          :class="`${styles.description}${classNames?.description ? ` ${classNames.description}` : ''}`"
          :style="{ textAlign: 'left' }"
        >
          <div style="display: flex; align-items: flex-start; gap: 10px">
            <div style="flex: 1; min-width: 0">
              <component
                v-if="typeof effectiveDescription === 'object'"
                :is="effectiveDescription"
              />
              <template v-else>{{ effectiveDescription }}</template>
            </div>
            <span v-if="showTimestamp" :class="styles.timestamp">{{ timestampStr }}</span>
          </div>
        </div>
      </Transition>

      <!-- Body toasts without description: timestamp on its own line -->
      <Transition name="gooey-fade">
        <div
          v-if="showBody && !hasDescription && hasAction && !dismissing && showTimestamp"
          key="timestamp-body"
          :class="styles.timestamp"
          :style="{ textAlign: 'right', marginTop: '8px', paddingLeft: '0' }"
        >
          {{ timestampStr }}
        </div>
      </Transition>

      <Transition name="gooey-fade-delay">
        <div
          v-if="showBody && hasAction && effectiveAction && !dismissing"
          key="action"
          :class="`${styles.actionWrapper}${classNames?.actionWrapper ? ` ${classNames.actionWrapper}` : ''}`"
        >
          <button
            :class="`${styles.actionButton} ${actionColorMap[effectivePhase]}${classNames?.actionButton ? ` ${classNames.actionButton}` : ''}`"
            @click="handleActionClick"
            type="button"
            :aria-label="effectiveAction.label"
          >
            {{ effectiveAction.label }}
          </button>
        </div>
      </Transition>

      <div
        v-if="showProgress"
        :key="progressKey"
        :class="`${styles.progressWrapper}${hovered || containerHovered ? ` ${styles.progressPaused}` : ''}`"
        :style="{ opacity: showBody && !actionSuccess ? 1 : 0 }"
      >
        <div
          :class="`${styles.progressBar} ${progressColorMap[effectivePhase]}`"
          :style="{
            '--gooey-progress-duration': `${progressDelayRef || (timing?.displayDuration ?? DEFAULT_DISPLAY_DURATION)}ms`,
          }"
        />
      </div>
    </div>
  </div>
</template>
