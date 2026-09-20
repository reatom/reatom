import { computed } from '@reatom/core'

import { resolvedThemeMode, themePack } from './model'
import { getThemeDefinition } from './themeDefinitions'

export type { ThemeVariables } from './design-system/themeTypes'
export { getThemeDefinition }

export const activeThemeVariables = computed(
  () => getThemeDefinition(themePack())[resolvedThemeMode()],
  'theme.activeVariables',
)
