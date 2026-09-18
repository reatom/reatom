import {
  action,
  computed,
  reatomBoolean,
  reatomEnum,
  reatomMediaQuery,
  withLocalStorage,
  withActions,
} from '@reatom/core'

import type { ResolvedThemeMode } from '../types'

export const themePack = reatomEnum(
  [
    'blueprint',
    'terminal',
    'paper',
    'polaroid',
    'obsidian',
    'bauhaus',
    'glass',
    'minimal',
    'retroOs',
  ],
  {
    name: 'themePack',
    initState: 'paper',
  },
)

themePack.extend(
  withLocalStorage({
    key: 'gallery.themePack',
    fromSnapshot: (snapshot) => {
      if (snapshot === 'monochrome') return themePack.enum.minimal
      if (snapshot === 'neon' || snapshot === 'aurora') return themePack.enum.paper
      for (const pack of Object.values(themePack.enum)) {
        if (pack === snapshot) return pack
      }
      return themePack.enum.paper
    },
  }),
)

const prefersDarkTheme = reatomMediaQuery('(prefers-color-scheme: dark)')

export const themeMode = reatomEnum(['light', 'dark', 'system'], {
  name: 'themeMode',
  initState: 'dark',
})

themeMode.extend(
  withLocalStorage({
    key: 'gallery.themeMode',
    fromSnapshot: (snapshot) => {
      for (const mode of Object.values(themeMode.enum)) {
        if (mode === snapshot) return mode
      }
      return themeMode.enum.dark
    },
  }),
)

export const resolvedThemeMode = computed<ResolvedThemeMode>(() => {
  const mode = themeMode()
  if (mode === 'system') return prefersDarkTheme() ? 'dark' : 'light'
  return mode
}, 'resolvedThemeMode')

export const toggleResolvedThemeMode = action(() => {
  themeMode.set(resolvedThemeMode() === 'light' ? 'dark' : 'light')
}, 'themeMode.toggleResolved')

const defaultShowImageNames = reatomBoolean(
  true,
  'defaultShowImageNames',
).extend(withLocalStorage('gallery.showImageNames'))
const minimalShowImageNames = reatomBoolean(
  false,
  'minimalShowImageNames',
).extend(withLocalStorage('gallery.minimal.showImageNames'))
const activeShowImageNames = () =>
  themePack() === 'minimal' ? minimalShowImageNames : defaultShowImageNames

export const showImageNames = computed(
  () => activeShowImageNames()(),
  'showImageNames',
).extend(
  withActions(() => ({
    change: (...params: Parameters<typeof defaultShowImageNames.set>) =>
      activeShowImageNames().set(...params),
    toggle: () => activeShowImageNames().toggle(),
    setTrue: () => activeShowImageNames().setTrue(),
    setFalse: () => activeShowImageNames().setFalse(),
    reset: () => activeShowImageNames().reset(),
  })),
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

export const glassBackgroundAnimation = reatomBoolean(
  false,
  'glassBackgroundAnimation',
).extend(withLocalStorage('gallery.glassBackgroundAnimation'))
