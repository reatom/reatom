import { computed, withMiddleware } from '../core'
import { withConnectHook } from '../extensions'
import { onEvent } from './onEvent'

/**
 * Creates a reactive atom that tracks a CSS media query state.
 *
 * The atom automatically updates when the media query match state changes,
 * providing a reactive way to respond to viewport changes, dark mode
 * preferences, and other media features.
 *
 * @example
 *   const isMobile = reatomMediaQuery('(max-width: 767px)')
 *   const isPrint = reatomMediaQuery('print')
 *
 * @example
 *   const isDarkModeMedia = reatomMediaQuery('(prefers-color-scheme: dark)')
 *
 *   const themeAtom = reatomEnum(
 *     ['light', 'dark', 'system'],
 *     'themeAtom',
 *   ).extend(
 *     withComputed((state) => {
 *       if (state === 'system') return isDarkModeMedia() ? 'dark' : 'light'
 *       return state
 *     }),
 *     withLocalStorage(),
 *     withChangeHook((state) => {
 *       document.body.classList.toggle('dark', state)
 *     }),
 *   )
 *
 * @param query - A CSS media query string (e.g., '(min-width: 768px)',
 *   '(prefers-color-scheme: dark)')
 * @returns An atom that holds the current match state as a boolean
 */
export let reatomMediaQuery = (query: string) => {
  let media = globalThis.matchMedia?.(query)
  let mediaAtom = computed(() => false, `mediaQuery#${query}`)

  if (media) {
    mediaAtom.extend(
      withMiddleware(() => () => media.matches),
      withConnectHook((target) => onEvent(media, 'change', () => target())),
    )
  }

  return mediaAtom
}
