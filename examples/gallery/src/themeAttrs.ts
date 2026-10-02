import { dataAttr } from '@reatom/jsx'

import { resolvedThemeMode, themePack } from './model'

export const packAttr = dataAttr('theme-pack', themePack)
export const modeAttr = dataAttr('theme-mode', resolvedThemeMode)

export const bindRefs = (
  ...refs: Array<undefined | ((element: HTMLElement) => void | (() => void))>
) => {
  return (element: HTMLElement) => {
    const cleanups = refs.map((ref) => ref?.(element))
    return () => {
      for (const cleanup of cleanups) cleanup?.()
    }
  }
}
