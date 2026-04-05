import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export function useReducedMotion(): Ref<boolean> {
  const prefersReducedMotion = ref(false)

  onMounted(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = query.matches

    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.value = e.matches
    }

    query.addEventListener('change', handler)

    onUnmounted(() => {
      query.removeEventListener('change', handler)
    })
  })

  return prefersReducedMotion
}
