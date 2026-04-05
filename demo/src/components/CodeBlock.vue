<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { codeToHtml } from 'shiki'

interface Props {
  code: string
  lang?: string
  showCopy?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  lang: 'typescript',
  showCopy: true,
})

const html = ref('')
const isHighlighted = ref(false)
const copied = ref(false)

const highlight = async () => {
  try {
    html.value = await codeToHtml(props.code, {
      lang: props.lang,
      theme: 'vitesse-light',
    })
    isHighlighted.value = true
  } catch {
    html.value = `<pre><code>${props.code}</code></pre>`
    isHighlighted.value = true
  }
}

const copy = async () => {
  await navigator.clipboard.writeText(props.code)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

onMounted(() => {
  highlight()
})

watch(
  () => props.code,
  () => {
    isHighlighted.value = false
    highlight()
  }
)
</script>

<template>
  <div class="code-wrapper">
    <button v-if="showCopy" class="copy-btn" @click="copy">
      {{ copied ? 'Copied!' : 'Copy' }}
    </button>
    <div v-if="isHighlighted" v-html="html" class="shiki-wrapper"></div>
    <pre v-else><code>{{ code }}</code></pre>
  </div>
</template>

<style scoped>
.code-wrapper {
  position: relative;
  margin-bottom: 0.75rem;
}

.copy-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  background: var(--card-hover);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: var(--font-body);
  color: var(--text-secondary);
  z-index: 10;
}

.copy-btn:hover {
  background: var(--card-active);
  color: var(--text);
}

.copy-btn:active {
  transform: scale(0.95);
}

.shiki-wrapper :deep(pre) {
  margin: 0;
  padding: 1.25rem 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.8;
  box-shadow: var(--shadow-sm);
}

.shiki-wrapper :deep(code) {
  font-family: var(--font-mono);
}

pre {
  margin: 0;
  padding: 1.25rem 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.8;
  box-shadow: var(--shadow-sm);
  color: var(--text-secondary);
}

code {
  font-family: var(--font-mono);
}

@media (max-width: 768px) {
  .copy-btn {
    top: 0.5rem;
    right: 0.5rem;
    padding: 3px 8px;
    font-size: 10px;
  }

  .shiki-wrapper :deep(pre),
  pre {
    padding: 1rem;
    font-size: 0.72rem;
    border-radius: var(--radius-sm);
  }
}
</style>
