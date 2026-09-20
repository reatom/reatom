import type { JSX } from '@reatom/jsx'

import { ThemeRoot } from '../design-system'
import type { ResolvedThemeMode, ThemePack } from '../types'

export const StoryWrapper = ({
  children,
  pack,
  mode,
}: {
  children: JSX.ElementChildren
  pack?: ThemePack
  mode?: ResolvedThemeMode
}) => (
  <ThemeRoot
    pack={pack}
    mode={mode}
    css={`
      min-height: 100vh;
      padding: 20px;
    `}
  >
    {children}
  </ThemeRoot>
)
