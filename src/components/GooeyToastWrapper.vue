<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { VNode } from 'vue'
import type {
  GooeyToastPhase,
  GooeyToastType,
  GooeyToastAction,
  GooeyToastClassNames,
  GooeyToastTimings,
  GooeyToastUpdateOptions,
} from '../types'
import type { AnimationPresetName } from '../presets'
import GooeyToast from './GooeyToast.vue'
import ToastErrorBoundary from './ToastErrorBoundary.vue'
import { _toastCallbacks, _toastUpdateListeners, _onToastDismissed } from '../gooey-toast'

const props = withDefaults(
  defineProps<{
    initialPhase: GooeyToastPhase
    title: string
    type: GooeyToastType
    description?: VNode | string | null | undefined
    action?: GooeyToastAction
    icon?: VNode | string | null | undefined
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
    toastId: string | number
    onDismiss?: (id: string | number) => void
    onAutoClose?: (id: string | number) => void
    isPaused?: boolean
  }>(),
  {
    showTimestamp: true,
    isPaused: false,
  }
)

const _emit = defineEmits<{
  closeToast: []
}>()

const title = ref(props.title)
const type = ref(props.type)
const phase = ref<GooeyToastPhase>(props.initialPhase)
const description = ref(props.description)
const action = ref(props.action)
const currentIcon = ref<VNode | string | null | undefined>(props.icon)
const showTimestamp = ref(props.showTimestamp)
const mountedRef = ref(true)

watch(
  () => [props.onDismiss, props.onAutoClose],
  () => {
    if (props.onDismiss || props.onAutoClose) {
      _toastCallbacks.set(props.toastId, {
        onDismiss: props.onDismiss,
        onAutoClose: props.onAutoClose,
      })
    }
  },
  { immediate: true }
)

onMounted(() => {
  const handleUpdate = (opts: GooeyToastUpdateOptions) => {
    if (opts.title !== undefined) title.value = opts.title
    if (opts.description !== undefined) description.value = opts.description
    if (opts.type !== undefined) {
      type.value = opts.type
      phase.value = opts.type
    }
    if (opts.action !== undefined) action.value = opts.action
    if ('icon' in opts) currentIcon.value = opts.icon ?? undefined
    if (opts.showTimestamp !== undefined) showTimestamp.value = opts.showTimestamp
  }
  _toastUpdateListeners.set(props.toastId, handleUpdate)

  mountedRef.value = true

  onUnmounted(() => {
    _toastUpdateListeners.delete(props.toastId)
    mountedRef.value = false
    setTimeout(() => {
      if (!mountedRef.value) _onToastDismissed(props.toastId)
    }, 100)
  })
})
</script>

<template>
  <ToastErrorBoundary>
    <GooeyToast
      :title="title"
      :description="description ?? undefined"
      :type="type"
      :action="action"
      :icon="currentIcon ?? undefined"
      :phase="phase"
      :classNames="classNames"
      :fill-color="fillColor"
      :border-color="borderColor"
      :border-width="borderWidth"
      :timing="timing"
      :preset="preset"
      :spring="spring"
      :bounce="bounce"
      :show-progress="showProgress"
      :show-timestamp="showTimestamp"
      :toast-id="toastId"
    />
  </ToastErrorBoundary>
</template>
