import type { Computed } from '../core'
import { computed } from '../core'
import { withChangeHook, withInitHook } from '../extensions'
import type { EnumAtom } from '../primitives'
import { reatomEnum } from '../primitives'
import { reatomMediaQuery } from './reatomMediaQuery'

/** An effective color scheme, with the system preference resolved. */
export type Theme = 'light' | 'dark'
/** A selected color scheme, or `system` to follow the OS preference. */
export type ThemePreference = Theme | 'system'

/** Theme preference enum with a computed effective color scheme. */
export type ThemeAtom = EnumAtom<ThemePreference> & {
  /**
   * Effective light/dark scheme. Tracks `prefers-color-scheme` in system mode
   * while subscribed; falls back to light when `matchMedia` is unavailable.
   */
  resolved: Computed<Theme>
}

const syncTheme = (preference: ThemePreference) => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.colorScheme =
      preference === 'system' ? 'light dark' : preference
  }
}

const initThemeAtom = (): ThemeAtom => {
  const systemDark = reatomMediaQuery(
    '(prefers-color-scheme: dark)',
    'theme._systemDark',
  )

  const preference = reatomEnum(['light', 'dark', 'system'], {
    name: 'theme',
    initState: 'system',
  }) as EnumAtom<ThemePreference>

  return preference
    .extend(withInitHook(syncTheme), withChangeHook(syncTheme))
    .extend((target) => ({
      resolved: computed((): Theme => {
        const preference = target()
        if (preference !== 'system') return preference
        return typeof globalThis.matchMedia === 'function' && systemDark()
          ? 'dark'
          : 'light'
      }, 'theme.resolved'),
    }))
}

/**
 * Manages light/dark/system selection, defaulting to `system`. Read
 * `resolved()` for the effective light/dark scheme.
 *
 * @remarks
 *   On initialization and preference changes, sets the root CSS `color-scheme` to
 *   `light`, `dark`, or `light dark` (system). Use CSS `light-dark()` for
 *   custom colors. DOM synchronization is skipped during SSR; persistence is
 *   opt-in via `withLocalStorage`.
 * @example
 *   import { themeAtom, withLocalStorage } from '@reatom/core'
 *
 *   themeAtom.extend(withLocalStorage('theme')) // Optional persistence.
 *   themeAtom.setDark()
 *   themeAtom.resolved() // 'dark'
 *   themeAtom.setSystem()
 *   themeAtom() // 'system'
 *   themeAtom.resolved() // 'light' or 'dark', following the OS preference.
 *   themeAtom.reset() // Restore the default system preference.
 */
export let themeAtom: ThemeAtom = /* @__PURE__ */ initThemeAtom()
