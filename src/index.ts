import './components/GooeyToast.css'

export { default as GooeyToaster } from './components/GooeyToaster.vue'
export { default as GoeyToaster } from './components/GooeyToaster.vue'
export { gooeyToast, goeyToast } from './gooey-toast'
export { animationPresets } from './presets'
export type { AnimationPreset, AnimationPresetName } from './presets'
export type {
  GooeyToastOptions,
  GooeyPromiseData,
  GooeyToasterProps,
  GooeyToastAction,
  GooeyToastClassNames,
  GooeyToastTimings,
  GooeyToastUpdateOptions,
  DismissFilter,
} from './types'

export type { GooeyPromiseData as GoeyPromiseData } from './types'
export type { GooeyToastClassNames as GoeyToastClassNames } from './types'
export type { GooeyToastTimings as GoeyToastTimings } from './types'
export type { GooeyToastOptions as GoeyToastOptions } from './types'
export type { GooeyToasterProps as GoeyToasterProps } from './types'
