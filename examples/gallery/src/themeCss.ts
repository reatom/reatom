import { css } from '@reatom/jsx'

import type { ResolvedThemeMode, ThemePack } from './types'

export const themeCss = (
  pack: ThemePack,
  rules: string,
  mode?: ResolvedThemeMode,
) => {
  const ancestor =
    mode === undefined
      ? `[data-theme-pack='${pack}']`
      : `[data-theme-pack='${pack}'][data-theme-mode='${mode}']`
  return css`
    :where(${ancestor}) & {
      ${rules}
    }
  `
}
