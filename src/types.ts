import type { VNode } from 'vue'
import type { ExternalToast, ToasterProps } from 'vue-sonner'
import type { AnimationPresetName } from './presets'

export type GooeyToastType = 'default' | 'success' | 'error' | 'warning' | 'info'

export interface GooeyToastTimings {
  displayDuration?: number
}

export interface GooeyToastClassNames {
  wrapper?: string
  content?: string
  header?: string
  title?: string
  icon?: string
  description?: string
  actionWrapper?: string
  actionButton?: string
}

export interface GooeyToastAction {
  label: string
  onClick: () => void
  successLabel?: string
}

export interface GooeyToastData {
  title: string
  description?: VNode | string | null | undefined
  type: GooeyToastType
  action?: GooeyToastAction
  icon?: VNode | string | null | undefined
  duration?: number
  classNames?: GooeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  preset?: AnimationPresetName
  spring?: boolean
  bounce?: number
  showTimestamp?: boolean
}

export interface GooeyToastOptions {
  description?: VNode | string | null | undefined
  action?: GooeyToastAction
  icon?: VNode | string | null | undefined
  duration?: number
  id?: string | number
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
  onDismiss?: (id: string | number) => void
  onAutoClose?: (id: string | number) => void
}

export interface GooeyPromiseData<T> {
  loading: string
  success: string | ((data: T) => string)
  error: string | ((error: unknown) => string)
  description?: {
    loading?: VNode | string | null | undefined
    success?: VNode | string | null | undefined | ((data: T) => VNode | string | null | undefined)
    error?:
      | VNode
      | string
      | null
      | undefined
      | ((error: unknown) => VNode | string | null | undefined)
  }
  action?: {
    success?: GooeyToastAction
    error?: GooeyToastAction
  }
  classNames?: GooeyToastClassNames
  fillColor?: string
  borderColor?: string
  borderWidth?: number
  timing?: GooeyToastTimings
  preset?: AnimationPresetName
  spring?: boolean
  bounce?: number
  showTimestamp?: boolean
  onDismiss?: (id: string | number) => void
  onAutoClose?: (id: string | number) => void
}

export type GooeyToastPhase = 'loading' | 'default' | 'success' | 'error' | 'warning' | 'info'

export interface GooeyToastUpdateOptions {
  title?: string
  description?: VNode | string | null | undefined
  type?: GooeyToastType
  action?: GooeyToastAction
  icon?: VNode | string | null | undefined | null
  showTimestamp?: boolean
}

export interface DismissFilter {
  type: GooeyToastType | GooeyToastType[]
}

export interface GooeyToasterProps {
  position?: ToasterProps['position']
  duration?: number
  gap?: number
  offset?: number | string
  theme?: 'light' | 'dark'
  toastOptions?: Partial<ExternalToast>
  expand?: boolean
  closeButton?: boolean | 'top-left' | 'top-right'
  richColors?: boolean
  visibleToasts?: number
  dir?: 'ltr' | 'rtl'
  preset?: AnimationPresetName
  spring?: boolean
  bounce?: number
  swipeToDismiss?: boolean
  closeOnEscape?: boolean
  maxQueue?: number
  queueOverflow?: 'drop-oldest' | 'drop-newest'
  showProgress?: boolean
}
