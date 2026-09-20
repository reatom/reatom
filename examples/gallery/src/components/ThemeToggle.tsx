import { IconButton } from '../design-system'
import { resolvedThemeMode, toggleResolvedThemeMode } from '../model'
import { MoonIcon, SunIcon } from './Icons'

export const ThemeToggle = () => (
  <IconButton
    label="Toggle theme"
    title="Toggle light/dark theme"
    onClick={toggleResolvedThemeMode}
  >
    {() => (resolvedThemeMode() === 'dark' ? <MoonIcon /> : <SunIcon />)}
  </IconButton>
)
