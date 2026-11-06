import {
  action,
  atom,
  computed,
  effect,
  reatomBoolean,
  reatomEnum,
  reatomMediaQuery,
  withLocalStorage,
  type Action,
  type Atom,
  type BooleanAtom,
  type Computed,
} from '@reatom/core'

import {
  DEFAULT_ACCENT,
  isAdminAccent,
  paletteVars,
  type AdminPaletteVars,
  type AdminResolvedScheme,
  type AdminScheme,
} from './design-system/tokens'
import { canPersistToLocalStorage } from '../filters/persistence'
import { ADMIN_FRAME } from '../root'

const ICONS_KEY = '_Admin.settings.icons.v1'
const COLORS_KEY = '_Admin.settings.colors.v1'
const GRAPH_CONTINUATIONS_KEY = '_Admin.settings.graphContinuations.v1'
const EQUAL_STATE_WARNINGS_KEY = '_Admin.settings.equalStateWarnings.v1'
const CORNER_KEY = '_Admin.settings.corner.v1'

/** Corner of the viewport where the admin panel docks. */
export type AdminPanelCorner =
  'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export function isAdminPanelCorner(value: unknown): value is AdminPanelCorner {
  return (
    value === 'top-left' ||
    value === 'top-right' ||
    value === 'bottom-left' ||
    value === 'bottom-right'
  )
}
const SCHEME_KEY = '_Admin.settings.scheme.v1'
const ACCENT_KEY = '_Admin.settings.accent.v1'

/**
 * A boolean the Settings "Local work" section shows as a switch.
 *
 * Create `checked` inside `ADMIN_FRAME` (the same frame as `reatomOtlpAdmin`).
 * The screen reads `checked()` and writes `checked.set`. `reatomBoolean`
 * matches that shape. Register with {@link registerLocalWorkOption} so every
 * shell on the page sees it. Do not hang this off `AdminConnection`.
 */
export interface AdminLocalWorkOption {
  /** Stable id. Registering the same id replaces that option in place. */
  id: string
  /** Accessible name of the switch. */
  label: string
  /** Visible detail. The switch points `aria-describedby` at it when set. */
  description?: string
  checked: Atom<boolean>
}

export interface AdminSettings {
  /** Kind icons beside record names. Default on. */
  icons: BooleanAtom
  /** Kind colors on bars, row bands, and chips. Default on. */
  colors: BooleanAtom
  /** Warn about structurally equal captured atom/computed updates. Default on. */
  equalStateWarnings: BooleanAtom
  /** Offscreen graph navigation strip above the timeline. Default on. */
  graphContinuations: BooleanAtom
  /**
   * Light, Dark, or the device scheme. Default Dark, so the shell stays on the
   * original violet night until a person chooses otherwise.
   */
  scheme: Atom<AdminScheme> & { reset(): AdminScheme }
  /** Picked accent. Light and dark palettes are calculated from this color. */
  accent: Atom<string>
  /** Light or dark after System follows the device. */
  resolvedScheme: Computed<AdminResolvedScheme>
  /** Shell colors for the resolved scheme and the picked accent. */
  palette: Computed<AdminPaletteVars>
  /**
   * Viewport corner for the open panel and the icon left behind when it is
   * closed. Default bottom right.
   */
  corner: Atom<AdminPanelCorner>
  /** Local-work switches, in registration order. */
  localWorkOptions: Atom<AdminLocalWorkOption[]>
  addLocalWorkOption: Action<[option: AdminLocalWorkOption], void>
  removeLocalWorkOption: Action<[option: AdminLocalWorkOption], void>
}

let settingsModel: AdminSettings | null = null

function createAdminSettings(): AdminSettings {
  const icons = reatomBoolean(true, '_Admin.settings.icons')
  const colors = reatomBoolean(true, '_Admin.settings.colors')
  const equalStateWarnings = reatomBoolean(
    true,
    '_Admin.settings.equalStateWarnings',
  )
  const graphContinuations = reatomBoolean(
    true,
    '_Admin.settings.graphContinuations',
  )
  const scheme = reatomEnum(['light', 'dark', 'system'] as const, {
    name: '_Admin.settings.scheme',
    initState: 'dark',
  })
  const accent = atom(DEFAULT_ACCENT, '_Admin.settings.accent')
  const corner = atom<AdminPanelCorner>(
    'bottom-right',
    '_Admin.settings.corner',
  )
  if (canPersistToLocalStorage()) {
    icons.extend(withLocalStorage(ICONS_KEY))
    colors.extend(withLocalStorage(COLORS_KEY))
    equalStateWarnings.extend(withLocalStorage(EQUAL_STATE_WARNINGS_KEY))
    graphContinuations.extend(withLocalStorage(GRAPH_CONTINUATIONS_KEY))
    scheme.extend(withLocalStorage(SCHEME_KEY))
    accent.extend(withLocalStorage(ACCENT_KEY))
    corner.extend(withLocalStorage(CORNER_KEY))
  }
  if (!isAdminAccent(accent())) accent.set(DEFAULT_ACCENT)
  if (!isAdminPanelCorner(corner())) corner.set('bottom-right')
  const prefersDark =
    typeof globalThis.matchMedia === 'function'
      ? reatomMediaQuery(
          '(prefers-color-scheme: dark)',
          '_Admin.settings.prefersDark',
        )
      : atom(true, '_Admin.settings.prefersDark')
  const resolvedScheme = computed((): AdminResolvedScheme => {
    const mode = scheme()
    if (mode === 'light' || mode === 'dark') return mode
    return prefersDark() ? 'dark' : 'light'
  }, '_Admin.settings.resolvedScheme')
  const palette = computed(
    () => paletteVars(accent(), resolvedScheme()),
    '_Admin.settings.palette',
  )
  const localWorkOptions = atom<AdminLocalWorkOption[]>(
    [],
    '_Admin.settings.localWorkOptions',
  )
  const addLocalWorkOption = action((option: AdminLocalWorkOption) => {
    localWorkOptions.set((current) => {
      const index = current.findIndex((item) => item.id === option.id)
      if (index === -1) return [...current, option]
      const next = current.slice()
      next[index] = option
      return next
    })
  }, '_Admin.settings.addLocalWorkOption')
  const removeLocalWorkOption = action((option: AdminLocalWorkOption) => {
    localWorkOptions.set((current) => current.filter((item) => item !== option))
  }, '_Admin.settings.removeLocalWorkOption')
  return {
    icons,
    colors,
    graphContinuations,
    equalStateWarnings,
    scheme,
    accent,
    resolvedScheme,
    palette,
    corner,
    localWorkOptions,
    addLocalWorkOption,
    removeLocalWorkOption,
  }
}

/**
 * Display prefs and the local-work list shared by every admin shell on the
 * page. The atoms are created once, inside `ADMIN_FRAME`.
 */
export function adminSettings(): AdminSettings {
  if (settingsModel === null) {
    settingsModel = ADMIN_FRAME.run(createAdminSettings)
  }
  return settingsModel
}

/**
 * Puts `option` on every shell's Local work section.
 *
 * Safe to call from any frame; the write runs in `ADMIN_FRAME`. The returned
 * unregister drops this option object. Registering the same `id` again replaces
 * the previous option and leaves the older unregister as a no-op.
 */
export function registerLocalWorkOption(
  option: AdminLocalWorkOption,
): () => void {
  const settings = adminSettings()
  ADMIN_FRAME.run(() => settings.addLocalWorkOption(option))
  return () => {
    ADMIN_FRAME.run(() => settings.removeLocalWorkOption(option))
  }
}

let palettePaintCount = 0

/** Paints the calculated palette on a shell root. Returns the unbind. */
export function bindAdminPalette(element: HTMLElement): () => void {
  const settings = adminSettings()
  const stop = effect(() => {
    const scheme = settings.resolvedScheme()
    for (const [name, value] of Object.entries(settings.palette())) {
      element.style.setProperty(name, value)
    }
    element.style.setProperty('color-scheme', scheme)
    element.dataset['adminScheme'] = scheme
  }, `_Admin.settings.paintPalette.${++palettePaintCount}`)
  return () => {
    stop.unsubscribe()
  }
}

/** Story isolation: defaults after `_Admin` storage keys are removed. */
export function resetAdminSettings(): void {
  const settings = settingsModel
  if (settings === null) return
  ADMIN_FRAME.run(() => {
    settings.icons.setTrue()
    settings.colors.setTrue()
    settings.graphContinuations.setTrue()
    settings.equalStateWarnings.setTrue()
    settings.scheme.reset()
    settings.accent.set(DEFAULT_ACCENT)
    settings.corner.set('bottom-right')
    settings.localWorkOptions.set([])
  })
}
