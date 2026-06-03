import { themeMode } from '../model'
import { MoonIcon, SunIcon } from './Icons'

export const ThemeToggle = () => {
  const handleClick = () => {
    const next = themeMode() === 'light' ? 'dark' : 'light'
    themeMode.set(next)
  }

  return (
    <button
      on:click={handleClick}
      attr:aria-label="Toggle theme"
      css={`
        width: 36px;
        height: 36px;
        border: var(--border-width) var(--control-border-style) var(--border);
        border-radius: var(--radius-sm);
        background: var(--input-bg);
        color: var(--text-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;

        &:hover {
          border-color: var(--accent);
          color: var(--accent);
          transform: scale(1.05);
          background: var(--hover-bg);
          box-shadow: var(--glow);
        }

        &:active {
          transform: scale(0.95);
        }
      `}
    >
      {() => (themeMode() === 'light' ? <SunIcon /> : <MoonIcon />)}
    </button>
  )
}
