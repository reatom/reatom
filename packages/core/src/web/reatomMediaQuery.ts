import type { Atom } from '../core'
import { atom, named } from '../core'
import { reatomObservable } from '../methods'
import { onEvent } from './onEvent'

export type MediaQueryAtom = Atom<boolean> & {
  mediaQueryList: Atom<Pick<MediaQueryList, 'matches' | 'addEventListener'>>
}

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
 *     withLocalStorage('theme'),
 *     withChangeHook((state) => {
 *       if (state === 'system') {
 *         document.body.classList.remove('light', 'dark')
 *       } else {
 *         document.body.classList.toggle('dark', state === 'dark')
 *       }
 *     }),
 *   )
 *
 * @param query - A CSS media query string (e.g., '(min-width: 768px)',
 *   '(prefers-color-scheme: dark)')
 * @param name - An optional name for the atom
 * @returns An atom that holds the current match state as a boolean
 */
export let reatomMediaQuery = (
  query: string,
  name: string = named(`mediaQuery#${query}`),
): MediaQueryAtom => {
  let mediaQueryList = atom<
    Pick<MediaQueryList, 'matches' | 'addEventListener'>
  >(() => globalThis.matchMedia?.(query), `${name}._mediaQueryList`)

  return reatomObservable(() => {
    return {
      getState: () => mediaQueryList().matches,
      subscribe: (fn) =>
        onEvent(mediaQueryList() as MediaQueryList, 'change', () =>
          fn(mediaQueryList().matches),
        ),
    }
  }, name).extend(() => ({ mediaQueryList }))
}
