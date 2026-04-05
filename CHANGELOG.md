# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-05

### Added

- Initial Vue 3 port of [goey-toast](https://github.com/anl331/goey-toast)
- Organic blob morph animation (pill to blob and back)
- Five toast types: default, success, error, warning, info
- Description body with string or VNode support
- Timestamp display on toast UI with optional `showTimestamp` toggle
- Action button with optional success label morph-back
- Promise toasts with loading to success/error transitions
- Configurable timing: expand delay, morph duration, collapse, display
- Position support: top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
- Right-side positions auto-mirror the blob horizontally
- Center positions with symmetric morph animation
- Pre-dismiss collapse animation (blob shrinks to pill before exit)
- Custom fill color, border color, and border width
- CSS class overrides via classNames prop
- Close button with configurable position (`top-left` / `top-right`)
- Close button visible on hover, touch, and keyboard focus with scale animation
- Dark mode support
- RTL layout support
- Animation presets: smooth, bouncy, subtle, snappy
- Countdown progress bar with hover-pause and re-expand
- Keyboard dismiss (Escape) and swipe-to-dismiss on mobile
- Toast queue with configurable overflow strategy
- Dismiss callbacks: `onDismiss` and `onAutoClose`
- In-place toast updates via `gooeyToast.update()`
- Dismiss by type filter: `gooeyToast.dismiss({ type: 'error' })`
- Built on vue-sonner and motion-v
