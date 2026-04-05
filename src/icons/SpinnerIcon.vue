<script setup lang="ts">
withDefaults(defineProps<{ size?: number; class?: string }>(), { size: 20 })
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    :class="$props.class"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
</template>
