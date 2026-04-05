<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { subscribeAnnouncements } from '../context'

const politeMessage = ref('')
const assertiveMessage = ref('')

let unsubscribe: (() => void) | null = null

onMounted(() => {
  unsubscribe = subscribeAnnouncements(({ message, politeness }) => {
    if (politeness === 'assertive') {
      assertiveMessage.value = ''
      nextTick(() => {
        assertiveMessage.value = message
      })
    } else {
      politeMessage.value = ''
      nextTick(() => {
        politeMessage.value = message
      })
    }
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

const visuallyHidden: Record<string, string | number> = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}
</script>

<template>
  <div role="status" aria-live="polite" aria-atomic="true" :style="visuallyHidden">
    {{ politeMessage }}
  </div>
  <div role="alert" aria-live="assertive" aria-atomic="true" :style="visuallyHidden">
    {{ assertiveMessage }}
  </div>
</template>
