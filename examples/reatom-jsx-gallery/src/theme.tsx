import { theme } from './model'

const LIGHT_THEME: Record<string, string> = {
  '--bg-primary': '#f5f5f5',
  '--bg-secondary': '#ffffff',
  '--bg-tertiary': '#e8e8e8',
  '--text-primary': '#1a1a1a',
  '--text-secondary': '#666666',
  '--accent': '#e94560',
  '--border': '#ddd',
  '--card-bg': '#ffffff',
  '--overlay-bg': 'rgba(0,0,0,0.8)',
}

const DARK_THEME: Record<string, string> = {
  '--bg-primary': '#1a1a2e',
  '--bg-secondary': '#16213e',
  '--bg-tertiary': '#0f3460',
  '--text-primary': '#eeeeee',
  '--text-secondary': '#aaaaaa',
  '--accent': '#e94560',
  '--border': 'rgba(255,255,255,0.1)',
  '--card-bg': 'rgba(255,255,255,0.05)',
  '--overlay-bg': 'rgba(0,0,0,0.9)',
}

const THEMES = { light: LIGHT_THEME, dark: DARK_THEME } as const

export const GlobalStyles = () => {
  return (
    <div
      css={`
        :root {
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          background: var(--bg-primary);
          color: var(--text-primary);
          transition:
            background 0.3s,
            color 0.3s;
          min-height: 100vh;
          overflow-x: hidden;
        }

        a {
          color: var(--accent);
          text-decoration: none;
        }

        button {
          cursor: pointer;
          font-family: inherit;
          font-size: inherit;
        }

        input,
        select,
        textarea {
          font-family: inherit;
          font-size: inherit;
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: var(--bg-secondary);
        }

        ::-webkit-scrollbar-thumb {
          background: var(--text-secondary);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--accent);
        }
      `}
      style={() => ({ display: 'none', ...THEMES[theme()] })}
    />
  )
}
