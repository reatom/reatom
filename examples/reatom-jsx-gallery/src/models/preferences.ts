import {
  action,
  computed,
  reatomBoolean,
  reatomEnum,
  reatomMediaQuery,
  withLocalStorage,
} from '@reatom/core'

import type { ResolvedThemeMode } from '../types'

export const themePack = reatomEnum(
  [
    'blueprint',
    'neon',
    'terminal',
    'paper',
    'polaroid',
    'obsidian',
    'bauhaus',
    'aurora',
    'glass',
    'monochrome',
    'retroOs',
  ],
  {
    name: 'themePack',
    initState: 'polaroid',
  },
).extend(withLocalStorage('gallery.themePack'))

const prefersDarkTheme = reatomMediaQuery('(prefers-color-scheme: dark)')

export const themeMode = reatomEnum(['light', 'dark', 'system'], {
  name: 'themeMode',
  initState: 'system',
}).extend(withLocalStorage('gallery.themeMode'))

export const resolvedThemeMode = computed<ResolvedThemeMode>(() => {
  const mode = themeMode()
  if (mode === 'system') return prefersDarkTheme() ? 'dark' : 'light'
  return mode
}, 'resolvedThemeMode')

export const toggleResolvedThemeMode = action(() => {
  themeMode.set(resolvedThemeMode() === 'light' ? 'dark' : 'light')
}, 'themeMode.toggleResolved')

export const showImageNames = reatomBoolean(true, 'showImageNames').extend(
  withLocalStorage('gallery.showImageNames'),
)

export const showFileSizes = reatomBoolean(false, 'showFileSizes').extend(
  withLocalStorage('gallery.showFileSizes'),
)

export const ignoreExifOrientation = reatomBoolean(
  false,
  'ignoreExifOrientation',
).extend(withLocalStorage('gallery.ignoreExifOrientation'))

export const developRawFullSize = reatomBoolean(
  true,
  'developRawFullSize',
).extend(withLocalStorage('gallery.developRawFullSize'))
