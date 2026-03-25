import {
  PLAYER_THEME_IDS,
  PLAYER_THEME_VARS,
  serializeThemeVars,
  type PlayerThemeId,
} from '../themes'

function themeAttributeBlocks(): string {
  return PLAYER_THEME_IDS.filter((id) => id !== 'classic')
    .map(
      (id: PlayerThemeId) => `
      html[data-player-theme="${id}"] {
${serializeThemeVars(PLAYER_THEME_VARS[id])}
      }`,
    )
    .join('')
}

export const GlobalStyles = () => {
  const rootSkin = serializeThemeVars(PLAYER_THEME_VARS.classic)

  return (
    <style>{`
      :root {
        --player-width: 320px;
${rootSkin}
        --pixel-font:
          ui-monospace,
          'SFMono-Regular',
          Menlo,
          Monaco,
          Consolas,
          'Liberation Mono',
          monospace;
        --player-mono: var(--pixel-font);
      }
${themeAttributeBlocks()}

      @keyframes winamp-meter {
        0% {
          transform: scaleY(0.18);
        }

        34% {
          transform: scaleY(0.52);
        }

        60% {
          transform: scaleY(1);
        }

        78% {
          transform: scaleY(0.34);
        }

        100% {
          transform: scaleY(0.8);
        }
      }

      html {
        color-scheme: dark;
        background: var(--page-html-bg);
      }

      * {
        box-sizing: border-box;
      }

      #app {
        min-height: 100dvh;
      }

      body {
        margin: 0;
        min-height: 100dvh;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.08), transparent 22%),
          repeating-linear-gradient(
            45deg,
            var(--page-body-stripe-a) 0 12px,
            var(--page-body-stripe-b) 12px 24px
          ),
          linear-gradient(
            180deg,
            var(--page-body-grad-top) 0%,
            var(--page-body-grad-bottom) 100%
          );
        font-family:
          Tahoma,
          'Segoe UI',
          sans-serif;
        font-size: 11px;
        color: var(--page-body-text);
      }

      body::before {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        background:
          repeating-linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.03) 0 1px,
            transparent 1px 4px
          );
        opacity: 0.24;
      }

      body::after {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent 24%);
      }

      button,
      input,
      a {
        font: inherit;
      }

      button {
        color: inherit;
        border-radius: 0;
      }

      input {
        color: inherit;
      }

      ::placeholder {
        color: var(--skin-display-dim);
      }

      ::selection {
        background: var(--skin-selection-bg);
        color: var(--skin-selection-text);
      }

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `}</style>
  )
}
