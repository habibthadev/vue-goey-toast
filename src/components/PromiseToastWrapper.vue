<script setup lang="ts" generic="T">
import { ref, onMounted, onUnmounted, markRaw } from 'vue'
import { toast } from 'vue-sonner'
import type { VNode } from 'vue'
import type { GooeyToastPhase, GooeyToastType, GooeyToastAction, GooeyPromiseData } from '../types'
import GooeyToast from './GooeyToast.vue'
import ToastErrorBoundary from './ToastErrorBoundary.vue'
import {
  _toastCallbacks,
  _onToastDismissed,
  announce,
  buildAnnouncementMessage,
  DEFAULT_EXPANDED_DURATION,
} from '../gooey-toast'
import PromiseToastWrapper from './PromiseToastWrapper.vue'

const props = withDefaults(
  defineProps<{
    promise: Promise<T>
    data: GooeyPromiseData<T>
    toastId: string | number
    isPaused?: boolean
  }>(),
  {
    isPaused: false,
  }
)

const _emit = defineEmits<{
  closeToast: []
}>()

const phase = ref<GooeyToastPhase>('loading')
const title = ref(props.data.loading)
const description = ref<VNode | string | null | undefined>(props.data.description?.loading)
const action = ref<GooeyToastAction | undefined>(undefined)
const mountedRef = ref(true)

onMounted(() => {
  if (props.data.onDismiss || props.data.onAutoClose) {
    _toastCallbacks.set(props.toastId, {
      onDismiss: props.data.onDismiss,
      onAutoClose: props.data.onAutoClose,
    })
  }

  const resetDuration = (hasExpandedContent: boolean) => {
    const baseDuration =
      props.data.timing?.displayDuration ??
      (hasExpandedContent ? DEFAULT_EXPANDED_DURATION : undefined)
    const collapseDurMs = 0.9 * 1000
    const duration =
      baseDuration != null && hasExpandedContent ? baseDuration + collapseDurMs : baseDuration
    if (duration != null) {
      toast.custom(markRaw(PromiseToastWrapper), {
        id: props.toastId,
        duration,
        componentProps: { promise: props.promise, data: props.data, toastId: props.toastId },
      })
    }
  }

  props.promise
    .then((result) => {
      const desc =
        typeof props.data.description?.success === 'function'
          ? props.data.description.success(result)
          : props.data.description?.success
      const resolvedTitle =
        typeof props.data.success === 'function' ? props.data.success(result) : props.data.success
      title.value = resolvedTitle
      description.value = desc
      action.value = props.data.action?.success
      phase.value = 'success'
      resetDuration(Boolean(desc || props.data.action?.success))
      announce(buildAnnouncementMessage(resolvedTitle, desc), 'polite')
    })
    .catch((err) => {
      const desc =
        typeof props.data.description?.error === 'function'
          ? props.data.description.error(err)
          : props.data.description?.error
      const resolvedTitle =
        typeof props.data.error === 'function' ? props.data.error(err) : props.data.error
      title.value = resolvedTitle
      description.value = desc
      action.value = props.data.action?.error
      phase.value = 'error'
      resetDuration(Boolean(desc || props.data.action?.error))
      announce(buildAnnouncementMessage(resolvedTitle, desc), 'assertive')
    })

  mountedRef.value = true

  onUnmounted(() => {
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
      :type="phase === 'loading' ? 'info' : (phase as GooeyToastType)"
      :action="action"
      :phase="phase"
      :classNames="data.classNames"
      :fill-color="data.fillColor"
      :border-color="data.borderColor"
      :border-width="data.borderWidth"
      :timing="data.timing"
      :preset="data.preset"
      :spring="data.spring"
      :bounce="data.bounce"
      :show-timestamp="data.showTimestamp ?? true"
      :toast-id="toastId"
    />
  </ToastErrorBoundary>
</template>
