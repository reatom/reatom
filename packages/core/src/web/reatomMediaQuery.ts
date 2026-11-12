import type { Atom } from '../core'
import { atom, named } from '../core'
import { reatomObservable } from '../methods'
import { onEvent } from './onEvent'

/**
 * Atom returned by {@link reatomMediaQuery}.
 *
 * Exposes `query` and `mediaQueryList` so extension authors can build on top of
 * the atom without re-deriving them: `query` is the original CSS media query
 * string, useful for logging, debugging, or composing related atoms;
 * `mediaQueryList` is the inner atom holding the underlying `MediaQueryList`,
 * useful when an extension needs the raw browser object (e.g. to read extra
 * fields like `media`, attach additional listeners, or stub it in tests).
 */
export type MediaQueryAtom = Atom<boolean> & {
  /** The original CSS media query string this atom tracks. */
  query: string
  /** Inner atom holding the underlying `MediaQueryList` browser object. */
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
 *   import { effect, reatomMediaQuery } from '@reatom/core'
 *
 *   // In a component mount scope, close mobile filters on desktop.
 *   const isDesktop = reatomMediaQuery('(min-width: 1024px)')
 *   const filters =
 *     document.querySelector<HTMLDialogElement>('#mobile-filters')!
 *   effect(() => {
 *     if (isDesktop()) filters.close()
 *   }, 'closeMobileFilters')
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
      subscribe: (fn) => {
        const media = mediaQueryList() as MediaQueryList
        const unsubscribe = onEvent(media, 'change', () => fn(media.matches))
        // Refresh changes missed while disconnected, after attaching the listener.
        fn(media.matches)
        return unsubscribe
      },
    }
  }, name).extend(() => ({ query, mediaQueryList }))
}
