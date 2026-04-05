<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const hasError = ref(false)

onErrorCaptured((error) => {
  hasError.value = true
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
    console.error('[ToastErrorBoundary] Caught error:', error)
  }
  return false
})
</script>

<template>
  <slot v-if="!hasError" />
</template>
