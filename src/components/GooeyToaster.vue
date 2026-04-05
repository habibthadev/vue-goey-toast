<script setup lang="ts">
import { onMounted, onUnmounted, watch, computed } from 'vue'
import { Toaster } from 'vue-sonner'
import type { GooeyToasterProps } from '../types'
import { animationPresets } from '../presets'
import {
  setGooeyPosition,
  setGooeyDir,
  setGooeySpring,
  setGooeyBounce,
  setGooeyVisibleToasts,
  setContainerHovered,
  setGooeySwipeToDismiss,
  setGooeyCloseOnEscape,
  setGooeyTheme,
  setGooeyMaxQueue,
  setGooeyQueueOverflow,
  setGooeyShowProgress,
  setGooeyCloseButton,
} from '../context'
import { gooeyToast, _getMostRecentActiveId } from '../gooey-toast'
import AriaLiveAnnouncer from './AriaLiveAnnouncer.vue'

const props = withDefaults(defineProps<GooeyToasterProps>(), {
  position: 'bottom-right',
  gap: 14,
  offset: '24px',
  theme: 'light',
  swipeToDismiss: true,
  closeOnEscape: true,
  maxQueue: Infinity,
  queueOverflow: 'drop-oldest',
  showProgress: false,
})

const presetConfig = computed(() => (props.preset ? animationPresets[props.preset] : undefined))
const resolvedSpring = computed(() => props.spring ?? presetConfig.value?.spring ?? true)
const resolvedBounce = computed(() => props.bounce ?? presetConfig.value?.bounce)

watch(
  () => props.position,
  (val) => setGooeyPosition(val),
  { immediate: true }
)
watch(
  () => props.dir,
  (val) => setGooeyDir(val ?? 'ltr'),
  { immediate: true }
)
watch(
  () => props.theme,
  (val) => setGooeyTheme(val),
  { immediate: true }
)
watch(
  () => resolvedSpring.value,
  (val) => setGooeySpring(val),
  { immediate: true }
)
watch(
  () => resolvedBounce.value,
  (val) => setGooeyBounce(val),
  { immediate: true }
)
watch(
  () => props.swipeToDismiss,
  (val) => setGooeySwipeToDismiss(val),
  { immediate: true }
)
watch(
  () => props.closeOnEscape,
  (val) => setGooeyCloseOnEscape(val),
  { immediate: true }
)
watch(
  () => props.visibleToasts,
  (val) => setGooeyVisibleToasts(val ?? 3),
  { immediate: true }
)
watch(
  () => props.maxQueue,
  (val) => setGooeyMaxQueue(val),
  { immediate: true }
)
watch(
  () => props.queueOverflow,
  (val) => setGooeyQueueOverflow(val),
  { immediate: true }
)
watch(
  () => props.showProgress,
  (val) => setGooeyShowProgress(val),
  { immediate: true }
)
watch(
  () => props.closeButton,
  (val) => setGooeyCloseButton(val ?? false),
  { immediate: true }
)

onMounted(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.closeOnEscape) return
    if (e.key === 'Escape') {
      const recentId = _getMostRecentActiveId()
      if (recentId != null) {
        gooeyToast.dismiss(recentId)
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown)

  let expandObs: MutationObserver | null = null
  let currentOl: HTMLElement | null = null

  const syncFromExpanded = (ol: HTMLElement) => {
    const anyExpanded = ol.querySelector('[data-sonner-toast][data-expanded="true"]') !== null
    setContainerHovered(anyExpanded)
  }

  const attach = (ol: HTMLElement) => {
    if (ol === currentOl) return
    expandObs?.disconnect()
    currentOl = ol
    expandObs = new MutationObserver(() => syncFromExpanded(ol))
    expandObs.observe(ol, { attributes: true, attributeFilter: ['data-expanded'], subtree: true })
    syncFromExpanded(ol)
  }

  const el = document.querySelector<HTMLElement>('[data-sonner-toaster]')
  if (el) attach(el)

  let bodyRafId = 0
  const bodyObs = new MutationObserver(() => {
    if (bodyRafId) return
    bodyRafId = requestAnimationFrame(() => {
      bodyRafId = 0
      const found = document.querySelector<HTMLElement>('[data-sonner-toaster]')
      if (found) {
        attach(found)
      } else if (currentOl) {
        expandObs?.disconnect()
        currentOl = null
        setContainerHovered(false)
      }
    })
  })
  bodyObs.observe(document.body, { childList: true, subtree: true })

  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
    const testEl = document.createElement('div')
    testEl.setAttribute('data-gooey-toast-css', '')
    testEl.style.position = 'absolute'
    testEl.style.width = '0'
    testEl.style.height = '0'
    testEl.style.overflow = 'hidden'
    testEl.style.pointerEvents = 'none'
    document.body.appendChild(testEl)

    const value = getComputedStyle(testEl).getPropertyValue('--gooey-toast')
    document.body.removeChild(testEl)

    if (!value) {
      console.warn(
        '[vue-goey-toast] Styles not found. Make sure to import the CSS:\n\n' +
          '  import "vue-goey-toast/styles.css";\n'
      )
    }
  }

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
    if (bodyRafId) cancelAnimationFrame(bodyRafId)
    bodyObs.disconnect()
    expandObs?.disconnect()
    setContainerHovered(false)
  })
})
</script>

<template>
  <Toaster
    :position="position"
    :duration="duration"
    :gap="gap"
    :offset="offset"
    :theme="theme"
    :toast-options="{ unstyled: true, ...toastOptions }"
    :expand="expand"
    :close-button="false"
    :rich-colors="richColors"
    :visible-toasts="99"
    :dir="dir"
  />
  <AriaLiveAnnouncer />
</template>
