export const globalStyles = `
  :root {
    --paper: #0f171f;
    --paper-deep: #0a1016;
    --paper-raised: #121b25;
    --ink: #e4ecf3;
    --ink-dim: rgba(228, 236, 243, 0.62);
    --ink-faint: rgba(228, 236, 243, 0.34);
    --hairline: rgba(228, 236, 243, 0.12);
    --grid: rgba(228, 236, 243, 0.045);
    --grid-major: rgba(228, 236, 243, 0.09);
    --glass: #7cc7f2;
    --glass-fill: rgba(124, 199, 242, 0.14);
    --metal: rgba(228, 236, 243, 0.5);
    --accent: #ffb347;
    --accent-soft: rgba(255, 179, 71, 0.18);
    --warn: #ff6b6b;
    --font-mono: 'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;
    --font-ui: 'IBM Plex Sans Condensed', 'Helvetica Neue', Arial, sans-serif;
    color-scheme: dark;
    --label-tracking: 0.22em;
    --chip-tracking: 0.12em;
    --segment-tracking: 0.08em;
  }

  html[lang='ru'] {
    --label-tracking: 0.04em;
    --chip-tracking: 0.04em;
    --segment-tracking: 0.02em;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
    background-color: var(--paper);
    background-image:
      linear-gradient(var(--grid-major) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid-major) 1px, transparent 1px),
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size:
      80px 80px,
      80px 80px,
      16px 16px,
      16px 16px;
    background-position: -1px -1px;
    color: var(--ink);
    font-family: var(--font-ui);
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
  }

  ::selection {
    background: var(--accent);
    color: var(--paper-deep);
  }

  @keyframes prime-rise {
    from {
      opacity: 0;
      transform: translateY(0.5rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.001ms !important;
      transition-duration: 0.001ms !important;
    }
  }
`
