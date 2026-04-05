import { toast } from 'vue-sonner'
import { markRaw, type VNode } from 'vue'
import GooeyToastWrapper from './components/GooeyToastWrapper.vue'
import PromiseToastWrapper from './components/PromiseToastWrapper.vue'
import {
  getGooeyVisibleToasts,
  getGooeyMaxQueue,
  getGooeyQueueOverflow,
  announce as announceContext,
  type AriaLivePoliteness,
} from './context'
import type {
  GooeyToastOptions,
  GooeyPromiseData,
  GooeyToastType,
  GooeyToastUpdateOptions,
  DismissFilter,
} from './types'

export const DEFAULT_EXPANDED_DURATION = 4000

export function getAnnouncePoliteness(type: GooeyToastType): AriaLivePoliteness {
  return type === 'error' || type === 'warning' ? 'assertive' : 'polite'
}

export function buildAnnouncementMessage(
  title: string,
  description?: VNode | string | null | undefined
): string {
  if (!description || typeof description !== 'string') return title
  return `${title}: ${description}`
}

export function announce(message: string, politeness: AriaLivePoliteness = 'polite') {
  announceContext(message, politeness)
}

const _activeIds = new Map<string | number, GooeyToastType>()
const _queue: Array<{ id: string | number; type: GooeyToastType; create: () => void }> = []

export const _toastCallbacks = new Map<
  string | number,
  {
    onDismiss?: (id: string | number) => void
    onAutoClose?: (id: string | number) => void
  }
>()
const _autoCloseFlags = new Set<string | number>()
const _manualDismissFlags = new Set<string | number>()

export function _markAutoClose(id: string | number) {
  _autoCloseFlags.add(id)
}

export function _resetQueue() {
  _activeIds.clear()
  _queue.length = 0
  _toastUpdateListeners.clear()
  _toastCallbacks.clear()
  _autoCloseFlags.clear()
  _manualDismissFlags.clear()
}

export function _getMostRecentActiveId(): string | number | undefined {
  let last: string | number | undefined
  for (const id of _activeIds.keys()) last = id
  return last
}

function _processQueue() {
  const max = getGooeyVisibleToasts()
  while (_queue.length > 0 && _activeIds.size < max) {
    const next = _queue.shift()!
    _activeIds.set(next.id, next.type)
    next.create()
  }
}

function _enqueue(entry: {
  id: string | number
  type: GooeyToastType
  create: () => void
}): boolean {
  const maxQueue = getGooeyMaxQueue()
  const overflow = getGooeyQueueOverflow()
  if (_queue.length >= maxQueue) {
    if (overflow === 'drop-newest') return false
    _queue.shift()
  }
  _queue.push(entry)
  return true
}

export function _onToastDismissed(id: string | number) {
  if (!_activeIds.delete(id)) return
  _toastUpdateListeners.delete(id)

  const cbs = _toastCallbacks.get(id)
  if (cbs) {
    const isAutoClose = _autoCloseFlags.has(id) || !_manualDismissFlags.has(id)
    if (isAutoClose && cbs.onAutoClose) {
      try {
        cbs.onAutoClose(id)
      } catch {
        /* ignored */
      }
    }
    if (cbs.onDismiss) {
      try {
        cbs.onDismiss(id)
      } catch {
        /* ignored */
      }
    }
    _toastCallbacks.delete(id)
  }
  _autoCloseFlags.delete(id)
  _manualDismissFlags.delete(id)

  _processQueue()
}

export const _toastUpdateListeners = new Map<
  string | number,
  (opts: GooeyToastUpdateOptions) => void
>()

function updateGooeyToast(id: string | number, options: GooeyToastUpdateOptions) {
  const listener = _toastUpdateListeners.get(id)
  if (listener) {
    listener(options)
    if (options.type !== undefined && _activeIds.has(id)) {
      _activeIds.set(id, options.type)
    }
    if (options.title !== undefined) {
      announceContext(
        buildAnnouncementMessage(options.title, options.description),
        options.type ? getAnnouncePoliteness(options.type) : 'polite'
      )
    }
  }
}

function createGooeyToast(title: string, type: GooeyToastType, options?: GooeyToastOptions) {
  const hasExpandedContent = Boolean(options?.description || options?.action)
  const baseDuration =
    options?.timing?.displayDuration ??
    options?.duration ??
    (options?.description ? DEFAULT_EXPANDED_DURATION : undefined)
  const duration = hasExpandedContent ? Infinity : baseDuration

  const toastId = options?.id ?? Math.random().toString(36).slice(2)

  const create = () => {
    toast.custom(markRaw(GooeyToastWrapper), {
      duration,
      id: toastId,
      componentProps: {
        initialPhase: type,
        title: title,
        type: type,
        description: options?.description,
        action: options?.action,
        icon: options?.icon,
        classNames: options?.classNames,
        fillColor: options?.fillColor,
        borderColor: options?.borderColor,
        borderWidth: options?.borderWidth,
        timing: options?.timing,
        preset: options?.preset,
        spring: options?.spring,
        bounce: options?.bounce,
        showProgress: options?.showProgress,
        showTimestamp: options?.showTimestamp,
        toastId: toastId,
        onDismiss: options?.onDismiss,
        onAutoClose: options?.onAutoClose,
      },
    })
  }

  if (options?.onDismiss || options?.onAutoClose) {
    _toastCallbacks.set(toastId, { onDismiss: options.onDismiss, onAutoClose: options.onAutoClose })
  }

  announceContext(
    buildAnnouncementMessage(title, options?.description),
    getAnnouncePoliteness(type)
  )

  if (_activeIds.size < getGooeyVisibleToasts()) {
    _activeIds.set(toastId, type)
    create()
  } else {
    _enqueue({ id: toastId, type, create })
  }

  return toastId
}

function dismissGooeyToast(idOrFilter?: string | number | DismissFilter) {
  if (idOrFilter != null && typeof idOrFilter === 'object') {
    const filterTypes = Array.isArray(idOrFilter.type) ? idOrFilter.type : [idOrFilter.type]
    const typesSet = new Set<GooeyToastType>(filterTypes)

    for (let i = _queue.length - 1; i >= 0; i--) {
      if (typesSet.has(_queue[i].type)) {
        _queue.splice(i, 1)
      }
    }

    for (const [id, toastType] of _activeIds) {
      if (typesSet.has(toastType)) {
        _manualDismissFlags.add(id)
        toast.dismiss(id)
      }
    }
  } else if (idOrFilter != null) {
    const idx = _queue.findIndex((q) => q.id === idOrFilter)
    if (idx !== -1) {
      _queue.splice(idx, 1)
      return
    }
    _manualDismissFlags.add(idOrFilter)
    toast.dismiss(idOrFilter)
  } else {
    for (const id of _activeIds.keys()) {
      _manualDismissFlags.add(id)
    }
    _queue.length = 0
    _activeIds.clear()
    toast.dismiss()
  }
}

export const gooeyToast = Object.assign(
  (title: string, options?: GooeyToastOptions) => createGooeyToast(title, 'default', options),
  {
    success: (title: string, options?: GooeyToastOptions) =>
      createGooeyToast(title, 'success', options),
    error: (title: string, options?: GooeyToastOptions) =>
      createGooeyToast(title, 'error', options),
    warning: (title: string, options?: GooeyToastOptions) =>
      createGooeyToast(title, 'warning', options),
    info: (title: string, options?: GooeyToastOptions) => createGooeyToast(title, 'info', options),
    promise: <T>(promise: Promise<T>, data: GooeyPromiseData<T>) => {
      const id = Math.random().toString(36).slice(2)

      announceContext(buildAnnouncementMessage(data.loading, data.description?.loading), 'polite')

      if (data.onDismiss || data.onAutoClose) {
        _toastCallbacks.set(id, { onDismiss: data.onDismiss, onAutoClose: data.onAutoClose })
      }

      const create = () => {
        toast.custom(markRaw(PromiseToastWrapper), {
          id,
          duration: data.timing?.displayDuration != null || data.description ? Infinity : undefined,
          componentProps: { promise, data, toastId: id },
        })
      }

      if (_activeIds.size < getGooeyVisibleToasts()) {
        _activeIds.set(id, 'info')
        create()
      } else {
        _enqueue({ id, type: 'info', create })
      }

      return id
    },
    dismiss: dismissGooeyToast,
    update: updateGooeyToast,
  }
)

export const goeyToast = gooeyToast
