<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, h } from 'vue'
import { GooeyToaster, gooeyToast, animationPresets } from 'vue-goey-toast'
import type { GooeyToastOptions, GooeyToasterProps, AnimationPresetName } from 'vue-goey-toast'
import 'vue-goey-toast/styles.css'
import './App.css'
import CodeBlock from './components/CodeBlock.vue'
import changelogMd from '../../CHANGELOG.md?raw'

type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info'
type Page = 'home' | 'changelog'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function failAfter(ms: number) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('Failed')), ms))
}

function copyToClipboard(text: string) {
  window.navigator.clipboard.writeText(text)
}

function parseChangelog(markdown: string) {
  const lines = markdown.split('\n')
  const entries: Array<{
    version: string
    date: string
    title: string
    items: string[]
  }> = []

  let currentVersion = ''
  let currentDate = ''
  let currentTitle = ''
  let currentItems: string[] = []
  let inItemsList = false

  for (const line of lines) {
    const versionMatch = line.match(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})/)
    if (versionMatch) {
      if (currentVersion) {
        entries.push({
          version: currentVersion,
          date: currentDate,
          title: currentTitle,
          items: currentItems,
        })
      }
      currentVersion = versionMatch[1]
      currentDate = versionMatch[2]
      currentItems = []
      currentTitle = ''
      inItemsList = false
      continue
    }

    const titleMatch = line.match(/^### (.+)/)
    if (titleMatch) {
      currentTitle = titleMatch[1]
      inItemsList = true
      continue
    }

    if (inItemsList && line.trim().startsWith('-')) {
      const item = line.trim().substring(2)
      currentItems.push(item)
    }
  }

  if (currentVersion) {
    entries.push({
      version: currentVersion,
      date: currentDate,
      title: currentTitle,
      items: currentItems,
    })
  }

  return entries
}

const changelogEntries = computed(() => parseChangelog(changelogMd))

const installCopied = ref(false)
const codeCopied = ref(false)

const copyInstall = (text: string) => {
  copyToClipboard(text)
  installCopied.value = true
  setTimeout(() => (installCopied.value = false), 1500)
}

const copyCode = (text: string) => {
  copyToClipboard(text)
  codeCopied.value = true
  setTimeout(() => (codeCopied.value = false), 1500)
}

const DEMO_DEFAULTS = {
  spring: true,
  bounce: 0.3,
  timing: {
    displayDuration: 5000,
  },
} satisfies GooeyToastOptions

const TOAST_TYPES: ToastType[] = ['default', 'success', 'error', 'warning', 'info']
const POSITIONS: GooeyToasterProps['position'][] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]
const PRESET_NAMES: AnimationPresetName[] = ['smooth', 'bouncy', 'subtle', 'snappy']

const page = ref<Page>('home')
const mobileMenuOpen = ref(false)
const heroVisible = ref(true)
const heroLanding = ref(false)
const heroTitleRef = ref<HTMLHeadingElement | null>(null)
let prevHeroVisible = true

const bPosition = ref<GooeyToasterProps['position']>('top-left')
const bType = ref<ToastType>('success')
const bTitle = ref('Changes saved')
const bHasDesc = ref(true)
const bDesc = ref('Your changes have been saved and synced successfully.')
const bHasAction = ref(false)
const bActionLabel = ref('Undo')
const bFillColor = ref('#ffffff')
const bHasBorder = ref(false)
const bBorderColor = ref('#E0E0E0')
const bBorderWidth = ref(1.5)
const bDisplayDuration = ref(4000)
const bSpring = ref(true)
const bBounce = ref(0.4)
const bPreset = ref<AnimationPresetName | null>(null)
const bTheme = ref<'light' | 'dark'>('light')
const bShowProgress = ref(false)
const bCloseOnEscape = ref(true)
const bShowTimestamp = ref(true)
const bCloseButton = ref<boolean | 'top-left' | 'top-right'>(false)

let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!heroTitleRef.value) return
  observer = new IntersectionObserver(
    ([entry]) => {
      heroVisible.value = entry.isIntersecting
    },
    { threshold: 0, rootMargin: `-${56}px 0px 0px 0px` }
  )
  observer.observe(heroTitleRef.value)
})

onUnmounted(() => {
  observer?.disconnect()
})

watch(heroVisible, (newVal) => {
  if (newVal && !prevHeroVisible) {
    heroLanding.value = true
    setTimeout(() => (heroLanding.value = false), 500)
  }
  prevHeroVisible = newVal
})

watch(page, () => {
  mobileMenuOpen.value = false
  window.scrollTo(0, 0)
})

const scrollTo = (id: string) => {
  mobileMenuOpen.value = false
  if (page.value !== 'home') {
    page.value = 'home'
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  } else {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }
}

function handleLogoClick() {
  page.value = 'home'
  window.scrollTo(0, 0)
}

const fireBuilderToast = () => {
  const options: GooeyToastOptions = {}
  if (bHasDesc.value && bDesc.value) options.description = bDesc.value
  if (bHasAction.value && bActionLabel.value) {
    options.action = { label: bActionLabel.value, onClick: () => {}, successLabel: 'Done!' }
  }
  if (bFillColor.value !== '#ffffff') options.fillColor = bFillColor.value
  if (bHasBorder.value && bBorderColor.value) {
    options.borderColor = bBorderColor.value
    options.borderWidth = bBorderWidth.value
  }
  if (bDisplayDuration.value !== 4000) {
    options.timing = { displayDuration: bDisplayDuration.value }
  }
  if (bPreset.value) {
    options.preset = bPreset.value
  } else {
    if (!bSpring.value) options.spring = false
    options.bounce = bBounce.value
  }
  if (bShowProgress.value) options.showProgress = true
  if (!bShowTimestamp.value) options.showTimestamp = false

  if (bType.value === 'default') gooeyToast(bTitle.value, options)
  else gooeyToast[bType.value](bTitle.value, options)
}

const generatedCode = computed(() => {
  const lines: string[] = []
  const hasFill = bFillColor.value !== '#ffffff'
  const hasBorder = bHasBorder.value && bBorderColor.value
  const hasPreset = bPreset.value != null
  const hasSpringOff = !hasPreset && !bSpring.value
  const hasBounce = !hasPreset && bBounce.value !== 0.4
  const hasOpts =
    bHasDesc.value ||
    bHasAction.value ||
    hasFill ||
    hasBorder ||
    hasPreset ||
    hasSpringOff ||
    hasBounce ||
    bShowProgress.value ||
    !bShowTimestamp.value
  const call = bType.value === 'default' ? 'gooeyToast' : `gooeyToast.${bType.value}`

  const toasterProps = [`position="${bPosition.value}"`]
  if (bTheme.value !== 'light') toasterProps.push(`theme="${bTheme.value}"`)
  if (bShowProgress.value) toasterProps.push('showProgress')
  if (!bCloseOnEscape.value) toasterProps.push(':closeOnEscape="false"')
  if (bCloseButton.value === true) toasterProps.push('closeButton')
  else if (bCloseButton.value === 'top-left') toasterProps.push('closeButton="top-left"')
  else if (bCloseButton.value === 'top-right') toasterProps.push('closeButton="top-right"')
  lines.push(`<GooeyToaster ${toasterProps.join(' ')} />`)
  lines.push('')
  if (!hasOpts) {
    lines.push(`${call}('${bTitle.value}')`)
  } else {
    lines.push(`${call}('${bTitle.value}', {`)
    if (bHasDesc.value && bDesc.value) lines.push(`  description: '${bDesc.value}',`)
    if (bHasAction.value && bActionLabel.value) {
      lines.push(`  action: {`)
      lines.push(`    label: '${bActionLabel.value}',`)
      lines.push(`    onClick: () => {},`)
      lines.push(`  },`)
    }
    if (hasFill) lines.push(`  fillColor: '${bFillColor.value}',`)
    if (hasBorder) {
      lines.push(`  borderColor: '${bBorderColor.value}',`)
      lines.push(`  borderWidth: ${bBorderWidth.value},`)
    }
    if (hasPreset) lines.push(`  preset: '${bPreset.value}',`)
    if (hasSpringOff) lines.push(`  spring: false,`)
    if (hasBounce) lines.push(`  bounce: ${bBounce.value},`)
    if (bShowProgress.value) lines.push(`  showProgress: true,`)
    if (!bShowTimestamp.value) lines.push(`  showTimestamp: false,`)
    if (bDisplayDuration.value !== 4000) {
      lines.push(`  timing: {`)
      lines.push(`    displayDuration: ${bDisplayDuration.value},`)
      lines.push(`  },`)
    }
    lines.push(`})`)
  }
  return lines.join('\n')
})

const headerClass = computed(() => {
  return !heroVisible.value && page.value === 'home'
    ? 'site-header header--hero-hidden'
    : 'site-header'
})

const setPreset = (p: AnimationPresetName) => {
  if (bPreset.value === p) {
    bPreset.value = null
  } else {
    bPreset.value = p
    const cfg = animationPresets[p]
    bSpring.value = cfg.spring
    bBounce.value = cfg.bounce
  }
}

const toggleCloseButton = () => {
  bCloseButton.value = bCloseButton.value === false ? 'top-left' : false
}

const showDeploymentToast = () => {
  gooeyToast.success('Deployment complete', {
    ...DEMO_DEFAULTS,
    description: h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '300px' } },
      [
        h(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px' } },
          [
            h('span', { style: { color: '#888' } }, 'Environment'),
            h('span', { style: { fontWeight: 600 } }, 'Production'),
          ]
        ),
        h(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px' } },
          [
            h('span', { style: { color: '#888' } }, 'Branch'),
            h('span', { style: { fontWeight: 600 } }, 'main @ 3f8a2c1'),
          ]
        ),
        h(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px' } },
          [
            h('span', { style: { color: '#888' } }, 'Duration'),
            h('span', { style: { fontWeight: 600 } }, '2m 14s'),
          ]
        ),
        h('div', { style: { height: '1px', background: '#e5e5e5' } }),
        h('div', { style: { fontSize: '11px', color: '#888' } }, 'https://my-app.vercel.app'),
      ]
    ),
  })
}

const showUpdateToast = () => {
  const spinIcon = h(
    'svg',
    {
      width: '16',
      height: '16',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      style: { animation: 'gooey-spin 1s linear infinite' },
    },
    [h('path', { d: 'M21 12a9 9 0 1 1-6.22-8.56' })]
  )
  const id = gooeyToast('Uploading...', { ...DEMO_DEFAULTS, icon: spinIcon })
  setTimeout(() => {
    gooeyToast.update(id, {
      title: 'Upload complete!',
      type: 'success',
      icon: null,
      description: 'Your file has been uploaded and processed.',
    })
  }, 2000)
}
</script>

<template>
  <GooeyToaster
    :position="bPosition"
    :theme="bTheme"
    :showProgress="bShowProgress"
    :closeOnEscape="bCloseOnEscape"
    :closeButton="bCloseButton"
  />

  <header :class="headerClass">
    <div class="header-inner">
      <button class="header-logo" @click="handleLogoClick">
        vue-goey-toast
        <img src="/mascot.png" alt="" class="header-mascot" />
      </button>

      <nav class="header-nav">
        <button class="nav-link" @click="scrollTo('examples')">Examples</button>
        <button class="nav-link" @click="scrollTo('builder')">Builder</button>
        <button class="nav-link" @click="scrollTo('docs')">Docs</button>
        <button
          :class="['nav-link', page === 'changelog' ? 'nav-link--active' : '']"
          @click="page = 'changelog'"
        >
          Changelog
        </button>
      </nav>

      <div class="header-icons">
        <a
          href="https://github.com/habibthadev/vue-goey-toast"
          target="_blank"
          rel="noopener noreferrer"
          class="header-icon-link"
          aria-label="GitHub"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
            />
          </svg>
        </a>
        <a
          href="https://www.npmjs.com/package/vue-goey-toast"
          target="_blank"
          rel="noopener noreferrer"
          class="header-icon-link"
          aria-label="npm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"
            />
          </svg>
        </a>
      </div>

      <button class="mobile-menu-btn" @click="mobileMenuOpen = !mobileMenuOpen" aria-label="Menu">
        <svg
          v-if="mobileMenuOpen"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <svg
          v-else
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>

    <div v-if="mobileMenuOpen" class="mobile-menu">
      <button class="mobile-menu-link" @click="scrollTo('examples')">Examples</button>
      <button class="mobile-menu-link" @click="scrollTo('builder')">Builder</button>
      <button class="mobile-menu-link" @click="scrollTo('docs')">Docs</button>
      <button
        :class="['mobile-menu-link', page === 'changelog' ? 'mobile-menu-link--active' : '']"
        @click="
          () => {
            page = 'changelog'
            mobileMenuOpen = false
          }
        "
      >
        Changelog
      </button>
      <div class="mobile-menu-divider" />
      <div class="mobile-menu-icons">
        <a
          href="https://github.com/anl331/goey-toast"
          target="_blank"
          rel="noopener noreferrer"
          class="header-icon-link"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
            />
          </svg>
          GitHub
        </a>
        <a
          href="https://www.npmjs.com/package/goey-toast"
          target="_blank"
          rel="noopener noreferrer"
          class="header-icon-link"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"
            />
          </svg>
          npm
        </a>
      </div>
    </div>
  </header>

  <template v-if="page === 'changelog'">
    <div class="page-changelog">
      <button class="back-link" @click="page = 'home'">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to home
      </button>

      <div class="changelog-header">
        <h1>Changelog</h1>
        <p>What's new in vue-goey-toast.</p>
      </div>

      <div v-for="entry in changelogEntries" :key="entry.version" class="changelog-entry">
        <div class="changelog-version">
          <span class="changelog-tag">v{{ entry.version }}</span>
          <span class="changelog-date">{{ entry.date }}</span>
        </div>
        <div class="changelog-body">
          <h4>{{ entry.title }}</h4>
          <ul>
            <li
              v-for="(item, idx) in entry.items"
              :key="idx"
              v-html="item.replace(/`([^`]+)`/g, '<code>$1</code>')"
            ></li>
          </ul>
        </div>
      </div>
    </div>
  </template>

  <template v-else>
    <div class="hero">
      <div class="hero-badge"><span /> v0.1.0</div>
      <h1 ref="heroTitleRef" :class="heroLanding ? 'hero-title--landing' : ''">
        vue-goey-toast
        <img
          src="/mascot.png"
          alt="mascot"
          :class="`hero-mascot${heroLanding ? ' hero-mascot--landing' : ''}`"
        />
      </h1>
      <p class="hero-description">
        Morphing toast notifications for Vue. Organic blob animations, promise tracking, and full
        customization out of the box.
      </p>
      <div class="hero-install">
        <div class="install-wrapper">
          <code><span class="prompt">$</span> npm install vue-goey-toast</code>
          <button class="copy-btn" @click="copyInstall('npm install vue-goey-toast')">
            <svg
              v-if="installCopied"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <svg
              v-else
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
        <!-- <a
          href="https://www.buymeacoffee.com/gxWiwwHU0P"
          target="_blank"
          rel="noopener noreferrer"
          :style="{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 16px',
            fontSize: '15px',
            fontWeight: 700,
            fontFamily: 'Cookie, cursive',
            background: '#FFDD00',
            color: '#000',
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
            lineHeight: 1,
            alignSelf: 'stretch',
            transition: 'transform 0.15s ease',
          }"
          @mouseenter="($event.currentTarget as HTMLElement).style.transform = 'scale(1.05)'"
          @mouseleave="($event.currentTarget as HTMLElement).style.transform = ''"
        >
          <img
            src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
            alt=""
            width="20"
            height="28"
          />
          <span>Buy me a coffee</span>
        </a> -->
        <span class="install-hint">(yes, one "o" — the extra goo is already inside)</span>
      </div>
    </div>

    <div class="two-col" id="examples">
      <div class="examples">
        <div class="examples-header">
          <h2>Examples</h2>
          <span>Click to preview</span>
        </div>

        <div class="section">
          <div class="section-label">Toast Types</div>
          <div class="buttons">
            <button @click="gooeyToast('Notification received', DEMO_DEFAULTS)">Default</button>
            <button @click="gooeyToast.success('Changes Saved', DEMO_DEFAULTS)">Success</button>
            <button @click="gooeyToast.error('Something went wrong', DEMO_DEFAULTS)">Error</button>
            <button @click="gooeyToast.warning('Storage is almost full', DEMO_DEFAULTS)">
              Warning
            </button>
            <button @click="gooeyToast.info('New update available', DEMO_DEFAULTS)">Info</button>
          </div>
        </div>

        <div class="section">
          <div class="section-label">With Description</div>
          <div class="buttons">
            <button
              @click="
                gooeyToast.warning('Your session is about to expire', {
                  ...DEMO_DEFAULTS,
                  description: `You've been inactive for 25 minutes. Please save your work or your session will end automatically.`,
                })
              "
            >
              Warning + Description
            </button>
            <button
              @click="
                gooeyToast.error('Connection lost', {
                  ...DEMO_DEFAULTS,
                  description:
                    'Unable to reach the server. Check your internet connection and try again.',
                })
              "
            >
              Error + Description
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-label">With Action Button</div>
          <div class="buttons">
            <button
              @click="
                gooeyToast.error('Payment failed', {
                  ...DEMO_DEFAULTS,
                  description:
                    'Your card ending in 4242 was declined. Please update your payment method to continue.',
                  action: {
                    label: 'Update Payment',
                    onClick: () => gooeyToast.success('Redirecting...', DEMO_DEFAULTS),
                  },
                })
              "
            >
              Error + Action
            </button>
            <button
              @click="
                gooeyToast.info('Share link ready', {
                  ...DEMO_DEFAULTS,
                  description: 'Your share link has been generated and is ready to copy.',
                  action: {
                    label: 'Copy to Clipboard',
                    onClick: () => copyToClipboard('https://example.com/share/abc123'),
                    successLabel: 'Copied!',
                  },
                })
              "
            >
              Action + Success Pill
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Custom Component Body</div>
          <div class="buttons">
            <button @click="showDeploymentToast">VNode Description</button>
          </div>
        </div>

        <div class="section">
          <div class="section-label">No Spring (Smooth Easing)</div>
          <div class="buttons">
            <button
              @click="gooeyToast.success('Changes Saved', { ...DEMO_DEFAULTS, spring: false })"
            >
              Success (no spring)
            </button>
            <button
              @click="
                gooeyToast.error('Connection lost', {
                  ...DEMO_DEFAULTS,
                  spring: false,
                  description:
                    'Unable to reach the server. Check your internet connection and try again.',
                })
              "
            >
              Error + Desc (no spring)
            </button>
            <button
              @click="
                gooeyToast.info('Share link ready', {
                  ...DEMO_DEFAULTS,
                  spring: false,
                  description: 'Your share link has been generated and is ready to copy.',
                  action: {
                    label: 'Copy to Clipboard',
                    onClick: () => copyToClipboard('https://example.com/share/abc123'),
                    successLabel: 'Copied!',
                  },
                })
              "
            >
              Action (no spring)
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Promise (Morph Animation)</div>
          <div class="buttons">
            <button
              @click="
                gooeyToast.promise(sleep(2000), {
                  ...DEMO_DEFAULTS,
                  loading: 'Saving...',
                  success: 'Changes Saved',
                  error: 'Something went wrong',
                })
              "
            >
              Promise + Success (pill)
            </button>
            <button
              @click="
                gooeyToast.promise(failAfter(2000), {
                  ...DEMO_DEFAULTS,
                  loading: 'Saving...',
                  success: 'Changes Saved',
                  error: 'Something went wrong',
                })
              "
            >
              Promise + Error (pill)
            </button>
            <button
              @click="
                gooeyToast.promise(failAfter(2000), {
                  ...DEMO_DEFAULTS,
                  loading: 'Uploading file...',
                  success: 'Upload complete',
                  error: 'Upload failed',
                  description: {
                    error: `You've used 95% of your available storage. Please upgrade and plan to continue.`,
                  },
                  action: {
                    error: {
                      label: 'Action Button',
                      onClick: () => gooeyToast.info('Retrying...', DEMO_DEFAULTS),
                    },
                  },
                })
              "
            >
              Promise + Error (expanded)
            </button>
            <button
              @click="
                gooeyToast.promise(sleep(2000), {
                  ...DEMO_DEFAULTS,
                  loading: 'Processing...',
                  success: 'All done!',
                  error: 'Failed',
                  description: { success: 'Your data has been processed and saved successfully.' },
                })
              "
            >
              Promise + Success (expanded)
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Update Toast</div>
          <div class="buttons">
            <button @click="showUpdateToast">Update Toast</button>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Progress Bar</div>
          <div class="buttons">
            <button
              @click="
                gooeyToast.info('Downloading update...', {
                  ...DEMO_DEFAULTS,
                  description: 'This may take a moment.',
                  showProgress: true,
                })
              "
            >
              Progress Bar
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Callbacks</div>
          <div class="buttons">
            <button
              @click="
                gooeyToast.info('Watch me disappear', {
                  ...DEMO_DEFAULTS,
                  onDismiss: () => {
                    gooeyToast.success('Previous toast dismissed!', DEMO_DEFAULTS)
                  },
                })
              "
            >
              With Callback
            </button>
          </div>
        </div>
      </div>

      <div class="builder" id="builder">
        <div class="builder-header">
          <h2>Builder</h2>
          <p>Design and test your toast in real time.</p>
        </div>

        <div class="builder-card">
          <div class="builder-row">
            <div class="builder-label">Position</div>
            <div class="type-pills">
              <button
                v-for="p in POSITIONS"
                :key="p"
                class="type-pill"
                data-type="position"
                :data-active="bPosition === p"
                @click="bPosition = p"
              >
                {{ p }}
              </button>
            </div>
          </div>

          <div class="builder-row">
            <div class="builder-label">Type</div>
            <div class="type-pills">
              <button
                v-for="t in TOAST_TYPES"
                :key="t"
                class="type-pill"
                :data-type="t"
                :data-active="bType === t"
                @click="bType = t"
              >
                {{ t }}
              </button>
            </div>
          </div>

          <div class="builder-row">
            <div class="builder-label">Title</div>
            <input class="builder-input" v-model="bTitle" placeholder="Toast title..." />
          </div>

          <div class="builder-row">
            <div class="toggle-row">
              <span class="toggle-row-label">Description</span>
              <button class="toggle" :data-on="bHasDesc" @click="bHasDesc = !bHasDesc">
                <div class="toggle-knob" />
              </button>
            </div>
            <textarea
              v-if="bHasDesc"
              class="builder-input"
              style="margin-top: 10px"
              v-model="bDesc"
              placeholder="Description text..."
            />
          </div>

          <div class="builder-row">
            <div class="toggle-row">
              <span class="toggle-row-label">Action Button</span>
              <button class="toggle" :data-on="bHasAction" @click="bHasAction = !bHasAction">
                <div class="toggle-knob" />
              </button>
            </div>
            <input
              v-if="bHasAction"
              class="builder-input"
              style="margin-top: 10px"
              v-model="bActionLabel"
              placeholder="Button label..."
            />
          </div>

          <div class="builder-row">
            <div class="builder-label">Style</div>
            <div class="style-controls">
              <div class="color-row">
                <span class="color-row-label">Fill Color</span>
                <div class="color-picker-group">
                  <input type="color" class="color-input" v-model="bFillColor" />
                  <input
                    class="builder-input color-hex"
                    v-model="bFillColor"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              <div class="border-section">
                <div class="toggle-row">
                  <span class="toggle-row-label">Border</span>
                  <button class="toggle" :data-on="bHasBorder" @click="bHasBorder = !bHasBorder">
                    <div class="toggle-knob" />
                  </button>
                </div>
                <div v-if="bHasBorder" class="border-controls">
                  <div class="color-row">
                    <span class="color-row-label">Color</span>
                    <div class="color-picker-group">
                      <input type="color" class="color-input" v-model="bBorderColor" />
                      <input
                        class="builder-input color-hex"
                        v-model="bBorderColor"
                        placeholder="#E0E0E0"
                      />
                    </div>
                  </div>
                  <div class="slider-item">
                    <div class="slider-item-header">
                      <span class="slider-item-label">Width</span>
                      <span class="slider-item-value">{{ bBorderWidth }}px</span>
                    </div>
                    <input
                      type="range"
                      class="slider"
                      :min="0.5"
                      :max="4"
                      :step="0.5"
                      v-model.number="bBorderWidth"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="builder-row">
            <div class="builder-label">Timing</div>
            <div class="slider-group">
              <div class="slider-item">
                <div class="slider-item-header">
                  <span class="slider-item-label">Display Duration</span>
                  <span class="slider-item-value">{{ (bDisplayDuration / 1000).toFixed(1) }}s</span>
                </div>
                <input
                  type="range"
                  class="slider"
                  :min="1000"
                  :max="20000"
                  :step="500"
                  v-model.number="bDisplayDuration"
                />
              </div>
            </div>
          </div>

          <div class="builder-row">
            <div class="builder-label">Animation Preset</div>
            <div class="type-pills">
              <button
                v-for="p in PRESET_NAMES"
                :key="p"
                class="type-pill"
                data-type="position"
                :data-active="bPreset === p"
                @click="setPreset(p)"
              >
                {{ p }}
              </button>
            </div>
          </div>

          <div class="builder-row">
            <div class="builder-label">Spring Effect</div>
            <div class="slider-group">
              <div class="slider-item">
                <div class="slider-item-header">
                  <span class="slider-item-label">{{
                    bSpring ? `Bounce: ${bBounce.toFixed(2)}` : 'Off'
                  }}</span>
                  <button
                    class="toggle"
                    :data-on="bSpring"
                    @click="
                      () => {
                        bSpring = !bSpring
                        bPreset = null
                      }
                    "
                    style="transform: scale(0.85)"
                  >
                    <div class="toggle-knob" />
                  </button>
                </div>
                <input
                  v-if="bSpring"
                  type="range"
                  class="slider"
                  :min="0.05"
                  :max="0.8"
                  :step="0.05"
                  v-model.number="bBounce"
                  @input="bPreset = null"
                />
              </div>
            </div>
          </div>

          <div class="builder-row">
            <div class="builder-label">Theme</div>
            <div class="type-pills">
              <button
                v-for="t in ['light', 'dark'] as const"
                :key="t"
                class="type-pill"
                data-type="position"
                :data-active="bTheme === t"
                @click="bTheme = t"
              >
                {{ t }}
              </button>
            </div>
          </div>

          <div class="builder-row">
            <div class="toggle-row">
              <span class="toggle-row-label">Show Progress</span>
              <button
                class="toggle"
                :data-on="bShowProgress"
                @click="bShowProgress = !bShowProgress"
              >
                <div class="toggle-knob" />
              </button>
            </div>
          </div>

          <div class="builder-row">
            <div class="toggle-row">
              <span class="toggle-row-label">Close on Escape</span>
              <button
                class="toggle"
                :data-on="bCloseOnEscape"
                @click="bCloseOnEscape = !bCloseOnEscape"
              >
                <div class="toggle-knob" />
              </button>
            </div>
          </div>

          <div class="builder-row">
            <div class="toggle-row">
              <span class="toggle-row-label">Show Timestamp</span>
              <button
                class="toggle"
                :data-on="bShowTimestamp"
                @click="bShowTimestamp = !bShowTimestamp"
              >
                <div class="toggle-knob" />
              </button>
            </div>
          </div>

          <div class="builder-row">
            <div class="toggle-row">
              <span class="toggle-row-label">Close Button</span>
              <button class="toggle" :data-on="bCloseButton !== false" @click="toggleCloseButton">
                <div class="toggle-knob" />
              </button>
            </div>
          </div>
          <div v-if="bCloseButton !== false" class="builder-row">
            <div class="builder-label">Close Button Position</div>
            <div class="type-pills">
              <button
                v-for="pos in ['top-left', 'top-right'] as const"
                :key="pos"
                class="type-pill"
                data-type="position"
                :data-active="bCloseButton === pos"
                @click="bCloseButton = pos"
              >
                {{ pos }}
              </button>
            </div>
          </div>

          <div class="builder-row">
            <button class="fire-btn" @click="fireBuilderToast">Fire Toast</button>
          </div>

          <div class="builder-code">
            <button class="code-copy-btn" @click="copyCode(generatedCode)">
              {{ codeCopied ? 'Copied!' : 'Copy' }}
            </button>
            <CodeBlock :code="generatedCode" lang="typescript" />
          </div>
        </div>
      </div>
    </div>

    <div class="docs" id="docs">
      <div class="docs-header">
        <h2>Documentation</h2>
        <p>Everything you need to add morphing toast notifications to your Vue app.</p>
      </div>

      <div class="doc-section">
        <div class="doc-section-label">
          <div class="doc-number">01</div>
          <h3>Quick Start</h3>
        </div>
        <div class="doc-section-content">
          <p>
            Add the <span class="inline-code">GooeyToaster</span> component and call
            <span class="inline-code">gooeyToast</span> from anywhere.
          </p>
          <CodeBlock
            :code="`import { GooeyToaster, gooeyToast } from 'vue-goey-toast'

<template>
  <GooeyToaster position=&quot;bottom-right&quot; />
  <button @click=&quot;gooeyToast.success('Saved!')&quot;>
    Save
  </button>
</template>`"
            lang="vue"
          />
          <p>
            Requires <span class="inline-code">vue</span> and
            <span class="inline-code">motion-v</span> as peer dependencies.
          </p>
        </div>
      </div>

      <div class="doc-section">
        <div class="doc-section-label">
          <div class="doc-number">02</div>
          <h3>Toast Types</h3>
        </div>
        <div class="doc-section-content">
          <CodeBlock
            :code="`gooeyToast('Hello')                    // default (neutral)
gooeyToast.success('Saved!')           // green
gooeyToast.error('Failed')             // red
gooeyToast.warning('Careful')          // yellow
gooeyToast.info('FYI')                 // blue`"
            lang="typescript"
          />
          <div class="doc-try-buttons">
            <button @click="gooeyToast('Notification received', DEMO_DEFAULTS)">Default</button>
            <button @click="gooeyToast.success('Changes Saved', DEMO_DEFAULTS)">Success</button>
            <button @click="gooeyToast.error('Something went wrong', DEMO_DEFAULTS)">Error</button>
            <button @click="gooeyToast.warning('Storage is almost full', DEMO_DEFAULTS)">
              Warning
            </button>
            <button @click="gooeyToast.info('New update available', DEMO_DEFAULTS)">Info</button>
          </div>
        </div>
      </div>

      <div class="doc-section">
        <div class="doc-section-label">
          <div class="doc-number">03</div>
          <h3>Description</h3>
        </div>
        <div class="doc-section-content">
          <p>
            Pass a string or any <span class="inline-code">VNode</span> as the description to expand
            the toast into a blob.
          </p>
          <CodeBlock
            :code="`gooeyToast.error('Payment failed', {
  description: 'Your card was declined.',
})

// Custom component as body (using h function)
import { h } from 'vue'
gooeyToast.success('Deployed', {
  description: h('div', [
    h('strong', 'Production'),
    h('span', 'main @ 3f8a2c1'),
  ]),
})`"
            lang="typescript"
          />
          <div class="doc-try-buttons">
            <button
              @click="
                gooeyToast.warning('Your session is about to expire', {
                  ...DEMO_DEFAULTS,
                  description: `You've been inactive for 25 minutes. Please save your work or your session will end automatically.`,
                })
              "
            >
              Warning + Description
            </button>
            <button
              @click="
                gooeyToast.error('Connection lost', {
                  ...DEMO_DEFAULTS,
                  description:
                    'Unable to reach the server. Check your internet connection and try again.',
                })
              "
            >
              Error + Description
            </button>
          </div>
        </div>
      </div>

      <div class="doc-section">
        <div class="doc-section-label">
          <div class="doc-number">04</div>
          <h3>Action Button</h3>
        </div>
        <div class="doc-section-content">
          <p>
            Add <span class="inline-code">successLabel</span> for a pill morph-back animation on
            click.
          </p>
          <CodeBlock
            :code="`gooeyToast.info('Share link ready', {
  description: 'Your link has been generated.',
  action: {
    label: 'Copy to Clipboard',
    onClick: () => copyToClipboard(url),
    successLabel: 'Copied!',   // optional morph-back
  },
})`"
            lang="typescript"
          />
          <div class="doc-try-buttons">
            <button
              @click="
                gooeyToast.error('Payment failed', {
                  ...DEMO_DEFAULTS,
                  description:
                    'Your card ending in 4242 was declined. Please update your payment method to continue.',
                  action: {
                    label: 'Update Payment',
                    onClick: () => gooeyToast.success('Redirecting...', DEMO_DEFAULTS),
                  },
                })
              "
            >
              Error + Action
            </button>
            <button
              @click="
                gooeyToast.info('Share link ready', {
                  ...DEMO_DEFAULTS,
                  description: 'Your share link has been generated and is ready to copy.',
                  action: {
                    label: 'Copy to Clipboard',
                    onClick: () => copyToClipboard('https://example.com/share/abc123'),
                    successLabel: 'Copied!',
                  },
                })
              "
            >
              Action + Success Pill
            </button>
          </div>
        </div>
      </div>

      <div class="doc-section">
        <div class="doc-section-label">
          <div class="doc-number">05</div>
          <h3>Promise Toasts</h3>
        </div>
        <div class="doc-section-content">
          <p>Automatically transitions from loading to success/error when the promise resolves.</p>
          <CodeBlock
            :code="`gooeyToast.promise(saveData(), {
  loading: 'Saving...',
  success: 'Changes saved',
  error: 'Something went wrong',
  description: {
    success: 'All changes have been synced.',
    error: 'Please try again later.',
  },
  action: {
    error: {
      label: 'Retry',
      onClick: () => retry(),
    },
  },
})`"
            lang="typescript"
          />
          <div class="doc-try-buttons">
            <button
              @click="
                gooeyToast.promise(sleep(2000), {
                  ...DEMO_DEFAULTS,
                  loading: 'Saving...',
                  success: 'Changes Saved',
                  error: 'Something went wrong',
                })
              "
            >
              Promise + Success (pill)
            </button>
            <button
              @click="
                gooeyToast.promise(failAfter(2000), {
                  ...DEMO_DEFAULTS,
                  loading: 'Saving...',
                  success: 'Changes Saved',
                  error: 'Something went wrong',
                })
              "
            >
              Promise + Error (pill)
            </button>
            <button
              @click="
                gooeyToast.promise(sleep(2000), {
                  ...DEMO_DEFAULTS,
                  loading: 'Processing...',
                  success: 'All done!',
                  error: 'Failed',
                  description: { success: 'Your data has been processed and saved successfully.' },
                })
              "
            >
              Promise + Success (expanded)
            </button>
          </div>
        </div>
      </div>

      <div class="doc-section">
        <div class="doc-section-label">
          <div class="doc-number">06</div>
          <h3>Timings</h3>
        </div>
        <div class="doc-section-content">
          <p>
            Control how long toasts stay visible with the
            <span class="inline-code">timing</span> option.
          </p>
          <div class="table-scroll">
            <table class="prop-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>displayDuration</td>
                  <td>number</td>
                  <td>4000</td>
                  <td>Milliseconds toast stays visible</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="doc-section">
        <div class="doc-section-label">
          <div class="doc-number">07</div>
          <h3>Toaster Props</h3>
        </div>
        <div class="doc-section-content">
          <p>
            6 positions supported. Right-side positions auto-mirror the blob horizontally. Center
            positions use a symmetric morph where the body grows outward from the pill.
          </p>
          <CodeBlock :code="`<GooeyToaster position=&quot;top-center&quot; />`" lang="vue" />
          <div class="table-scroll">
            <table class="prop-table">
              <thead>
                <tr>
                  <th>Prop</th>
                  <th>Type</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>position</td>
                  <td>string</td>
                  <td>'bottom-right'</td>
                  <td>
                    6 positions: top-left, top-center, top-right, bottom-left, bottom-center,
                    bottom-right
                  </td>
                </tr>
                <tr>
                  <td>duration</td>
                  <td>number</td>
                  <td>—</td>
                  <td>Default display duration (ms)</td>
                </tr>
                <tr>
                  <td>gap</td>
                  <td>number</td>
                  <td>14</td>
                  <td>Gap between stacked toasts</td>
                </tr>
                <tr>
                  <td>offset</td>
                  <td>number | string</td>
                  <td>'24px'</td>
                  <td>Distance from screen edge</td>
                </tr>
                <tr>
                  <td>theme</td>
                  <td>'light' | 'dark'</td>
                  <td>'light'</td>
                  <td>Color theme</td>
                </tr>
                <tr>
                  <td>spring</td>
                  <td>boolean</td>
                  <td>true</td>
                  <td>Enable spring/bounce animations globally</td>
                </tr>
                <tr>
                  <td>bounce</td>
                  <td>number</td>
                  <td>0.4</td>
                  <td>Spring intensity: 0.05 (subtle) to 0.8 (dramatic)</td>
                </tr>
                <tr>
                  <td>closeOnEscape</td>
                  <td>boolean</td>
                  <td>true</td>
                  <td>Dismiss most recent toast on Escape key press</td>
                </tr>
                <tr>
                  <td>showProgress</td>
                  <td>boolean</td>
                  <td>false</td>
                  <td>Show countdown progress bar on all toasts</td>
                </tr>
                <tr>
                  <td>maxQueue</td>
                  <td>number</td>
                  <td>Infinity</td>
                  <td>Maximum number of toasts in the waiting queue</td>
                </tr>
                <tr>
                  <td>queueOverflow</td>
                  <td>'drop-oldest' | 'drop-newest'</td>
                  <td>'drop-oldest'</td>
                  <td>Behavior when queue exceeds maxQueue</td>
                </tr>
                <tr>
                  <td>swipeToDismiss</td>
                  <td>boolean</td>
                  <td>true</td>
                  <td>Enable swipe-to-dismiss touch gestures on mobile</td>
                </tr>
                <tr>
                  <td>preset</td>
                  <td>AnimationPresetName</td>
                  <td>—</td>
                  <td>Named animation preset (smooth, bouncy, subtle, snappy)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="doc-section">
        <div class="doc-section-label">
          <div class="doc-number">08</div>
          <h3>Options</h3>
        </div>
        <div class="doc-section-content">
          <div class="table-scroll">
            <table class="prop-table">
              <thead>
                <tr>
                  <th>Option</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>description</td>
                  <td>VNode</td>
                  <td>Body content (string or component)</td>
                </tr>
                <tr>
                  <td>action</td>
                  <td>GooeyToastAction</td>
                  <td>Action button config</td>
                </tr>
                <tr>
                  <td>icon</td>
                  <td>VNode</td>
                  <td>Custom icon override</td>
                </tr>
                <tr>
                  <td>duration</td>
                  <td>number</td>
                  <td>Display duration in ms</td>
                </tr>
                <tr>
                  <td>id</td>
                  <td>string | number</td>
                  <td>Unique toast identifier</td>
                </tr>
                <tr>
                  <td>classNames</td>
                  <td>GooeyToastClassNames</td>
                  <td>CSS class overrides</td>
                </tr>
                <tr>
                  <td>fillColor</td>
                  <td>string</td>
                  <td>Background color of the blob</td>
                </tr>
                <tr>
                  <td>borderColor</td>
                  <td>string</td>
                  <td>Border color of the blob</td>
                </tr>
                <tr>
                  <td>borderWidth</td>
                  <td>number</td>
                  <td>Border width in px (default 1.5)</td>
                </tr>
                <tr>
                  <td>timing</td>
                  <td>GooeyToastTimings</td>
                  <td>Animation timing overrides</td>
                </tr>
                <tr>
                  <td>spring</td>
                  <td>boolean</td>
                  <td>Enable spring/bounce animations (default true)</td>
                </tr>
                <tr>
                  <td>bounce</td>
                  <td>number</td>
                  <td>Spring intensity: 0.05 (subtle) to 0.8 (dramatic), default 0.4</td>
                </tr>
                <tr>
                  <td>showProgress</td>
                  <td>boolean</td>
                  <td>Show countdown progress bar on this toast</td>
                </tr>
                <tr>
                  <td>preset</td>
                  <td>AnimationPresetName</td>
                  <td>Named animation preset (smooth, bouncy, subtle, snappy)</td>
                </tr>
                <tr>
                  <td>onDismiss</td>
                  <td>(id: string | number) =&gt; void</td>
                  <td>Callback fired when toast is dismissed (any reason)</td>
                </tr>
                <tr>
                  <td>onAutoClose</td>
                  <td>(id: string | number) =&gt; void</td>
                  <td>Callback fired only when toast auto-closes (timer)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="doc-section">
        <div class="doc-section-label">
          <div class="doc-number">09</div>
          <h3>Methods</h3>
        </div>
        <div class="doc-section-content">
          <p>
            Beyond the basic <span class="inline-code">gooeyToast()</span> and type methods, the
            following methods are available for managing toasts programmatically.
          </p>
          <div class="table-scroll">
            <table class="prop-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Signature</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>gooeyToast.dismiss</td>
                  <td>(id?: string | number) =&gt; void</td>
                  <td>Dismiss a specific toast by ID, or all toasts if no ID</td>
                </tr>
                <tr>
                  <td>gooeyToast.dismiss</td>
                  <td>(filter: DismissFilter) =&gt; void</td>
                  <td>Dismiss all toasts matching a type filter</td>
                </tr>
                <tr>
                  <td>gooeyToast.update</td>
                  <td>(id, options: GooeyToastUpdateOptions) =&gt; void</td>
                  <td>Update an active toast's title, description, type, or action in place</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h4 style="margin-top: 20px; font-size: 13px">DismissFilter</h4>
          <CodeBlock
            :code="`interface DismissFilter {
  type: GooeyToastType | GooeyToastType[]
}

// Dismiss all error toasts
gooeyToast.dismiss({ type: 'error' })

// Dismiss all error and warning toasts
gooeyToast.dismiss({ type: ['error', 'warning'] })`"
            lang="typescript"
          />
          <h4 style="margin-top: 20px; font-size: 13px">GooeyToastUpdateOptions</h4>
          <CodeBlock
            :code="`interface GooeyToastUpdateOptions {
  title?: string
  description?: VNode
  type?: GooeyToastType
  action?: GooeyToastAction
}

// Update a toast in place
const id = gooeyToast.success('Uploading...')
gooeyToast.update(id, {
  title: 'Upload complete!',
  type: 'success',
  description: 'File has been processed.',
})`"
            lang="typescript"
          />
        </div>
      </div>

      <div class="doc-section">
        <div class="doc-section-label">
          <div class="doc-number">10</div>
          <h3>Custom Styling</h3>
        </div>
        <div class="doc-section-content">
          <p>
            Override styles for any part of the toast with
            <span class="inline-code">classNames</span>.
          </p>
          <CodeBlock
            :code="`gooeyToast.success('Styled!', {
  fillColor: '#1a1a2e',
  borderColor: '#333',
  borderWidth: 2,
  classNames: {
    wrapper: 'my-wrapper',
    title: 'my-title',
    description: 'my-desc',
    actionButton: 'my-btn',
  },
})`"
            lang="typescript"
          />
          <div class="doc-try-buttons">
            <button
              @click="
                gooeyToast.success('Styled!', {
                  ...DEMO_DEFAULTS,
                  fillColor: '#1a1a2e',
                  borderColor: '#333',
                  borderWidth: 2,
                  description: 'Custom fill and border styling.',
                })
              "
            >
              Try Custom Style
            </button>
          </div>
          <div class="table-scroll">
            <table class="prop-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>wrapper</td>
                  <td>Outer container</td>
                </tr>
                <tr>
                  <td>content</td>
                  <td>Content area</td>
                </tr>
                <tr>
                  <td>header</td>
                  <td>Icon + title row</td>
                </tr>
                <tr>
                  <td>title</td>
                  <td>Title text</td>
                </tr>
                <tr>
                  <td>icon</td>
                  <td>Icon wrapper</td>
                </tr>
                <tr>
                  <td>description</td>
                  <td>Body text</td>
                </tr>
                <tr>
                  <td>actionWrapper</td>
                  <td>Button container</td>
                </tr>
                <tr>
                  <td>actionButton</td>
                  <td>Action button</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="doc-section">
        <div class="doc-section-label">
          <div class="doc-number">11</div>
          <h3>Spring Animation</h3>
        </div>
        <div class="doc-section-content">
          <p>
            Disable the spring/bounce effect for a cleaner, more subtle animation style. Set
            per-toast or globally on the Toaster.
          </p>
          <CodeBlock
            :code="`// Per-toast
gooeyToast.success('Saved', {
  description: 'Your changes have been synced.',
  spring: false,
})

// Global default
<GooeyToaster :spring=&quot;false&quot; />`"
            lang="typescript"
          />
          <p>
            When <span class="inline-code">spring</span> is <span class="inline-code">false</span>,
            all spring-based animations (landing squish, blob morph, pill resize, header squish) use
            smooth ease-in-out curves instead. Error shake still works regardless. Per-toast values
            override the global setting.
          </p>
          <div class="doc-try-buttons">
            <button @click="gooeyToast.success('Smooth save', DEMO_DEFAULTS)">
              No Spring (pill)
            </button>
            <button
              @click="
                gooeyToast.warning('Storage warning', {
                  ...DEMO_DEFAULTS,
                  description: 'You are using 95% of your available storage.',
                })
              "
            >
              No Spring (expanded)
            </button>
            <button @click="gooeyToast.success('Bouncy save', { ...DEMO_DEFAULTS, spring: true })">
              With Spring (compare)
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>

  <footer class="site-footer">
    <p>
      Ported to Vue by
      <a href="https://habibthadev.tech" target="_blank" rel="noopener noreferrer">habibthadev</a>
      — based on the
      <a href="https://github.com/anl331/goey-toast" target="_blank" rel="noopener noreferrer"
        >original React version</a
      >
    </p>
  </footer>
</template>
