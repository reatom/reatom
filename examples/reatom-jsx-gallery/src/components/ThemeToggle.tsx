import { themeMode } from '../model'

const SunIcon = () => (
  <svg:svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    attr:stroke-width="2"
    attr:stroke-linecap="round"
    attr:stroke-linejoin="round"
  >
    <svg:circle cx="12" cy="12" r="5" />
    <svg:line x1="12" y1="1" x2="12" y2="3" />
    <svg:line x1="12" y1="21" x2="12" y2="23" />
    <svg:line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <svg:line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <svg:line x1="1" y1="12" x2="3" y2="12" />
    <svg:line x1="21" y1="12" x2="23" y2="12" />
    <svg:line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <svg:line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg:svg>
)

const MoonIcon = () => (
  <svg:svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    attr:stroke-width="2"
    attr:stroke-linecap="round"
    attr:stroke-linejoin="round"
  >
    <svg:path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg:svg>
)

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
