import { srOnlyCss } from '../a11y'
import { resolvedThemeMode, themePack } from '../model'
import { activeThemeVariables, GlobalStyles } from '../theme'

export const AppShell = ({ children }: { children: unknown }) => (
  <div
    attr:data-theme-pack={themePack}
    attr:data-theme-mode={resolvedThemeMode}
    style={() => activeThemeVariables()}
    css={`
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--bg-primary);
      background-image: var(--app-bg-image);
      background-size: var(--bg-size);
      color: var(--text-primary);
      font-family: var(--font-ui);
      overflow: hidden;
      transition:
        background 0.3s,
        color 0.3s;

      &[data-theme-pack='blueprint'] button,
      &[data-theme-pack='blueprint'] input {
        border-style: dashed;
      }

      &[data-theme-pack='blueprint'][data-theme-mode='light'] main {
        background-color: #eaf8ff;
        background-image:
          linear-gradient(rgba(2, 132, 168, 0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(2, 132, 168, 0.12) 1px, transparent 1px);
        background-size: 28px 28px;
      }

      &[data-theme-pack='neon'] button,
      &[data-theme-pack='neon'] input {
        box-shadow: var(--glow);
      }

      &[data-theme-pack='neon'][data-theme-mode='light'] main {
        background-color: #f7f5ff;
        background-image:
          radial-gradient(
            circle at 15% 20%,
            rgba(192, 38, 211, 0.16),
            transparent 31%
          ),
          radial-gradient(
            circle at 90% 8%,
            rgba(8, 145, 178, 0.16),
            transparent 29%
          ),
          linear-gradient(135deg, rgba(124, 58, 237, 0.08), transparent 48%);
      }

      &[data-theme-pack='terminal'] {
        letter-spacing: 0.01em;
      }

      &[data-theme-pack='terminal'][data-theme-mode='light'] main {
        background-color: #f4f6ef;
        background-image:
          linear-gradient(rgba(15, 107, 58, 0.055) 50%, transparent 50%),
          linear-gradient(90deg, rgba(15, 107, 58, 0.03) 1px, transparent 1px);
        background-size:
          100% 4px,
          22px 22px;
      }

      &[data-theme-pack='terminal'] button,
      &[data-theme-pack='terminal'] input {
        border-radius: 0;
      }

      &[data-theme-pack='terminal'] button {
        letter-spacing: 0.04em;
        box-shadow: inset 0 0 0 1px var(--input-bg);
      }

      &[data-theme-pack='terminal'] button[data-terminal-bracket='true'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.25em;
      }

      &[data-theme-pack='terminal']
        button[data-terminal-bracket='true']::before {
        content: '[';
        color: var(--text-muted);
      }

      &[data-theme-pack='terminal']
        button[data-terminal-bracket='true']::after {
        content: ']';
        color: var(--text-muted);
      }

      &[data-theme-pack='bauhaus'] button {
        box-shadow: var(--glow);
      }

      &[data-theme-pack='bauhaus'] button:hover {
        box-shadow: var(--card-hover-shadow);
      }

      &[data-theme-pack='bauhaus'] main {
        background-image: var(--app-bg-image);
        background-size: var(--bg-size);
        padding: calc(20px + var(--shadow-clearance, 0px))
          calc(24px + var(--shadow-clearance, 0px));
      }

      &[data-theme-pack='bauhaus'][data-theme-mode='light'] main {
        background-color: #fff1b8;
        background-image: var(--app-bg-image);
      }

      &[data-theme-pack='obsidian'] button,
      &[data-theme-pack='obsidian'] input {
        clip-path: var(--surface-clip-path);
      }

      &[data-theme-pack='obsidian'][data-theme-mode='light'] main {
        background-color: #e7e9ee;
        background-image:
          linear-gradient(135deg, rgba(15, 23, 42, 0.12), transparent 26%),
          linear-gradient(315deg, rgba(71, 85, 105, 0.12), transparent 24%);
      }

      &[data-theme-pack='paper'][data-theme-mode='light'] main {
        background-color: #f5ecd9;
        background-image:
          radial-gradient(
            circle at 20% 30%,
            rgba(42, 33, 23, 0.055) 0 1px,
            transparent 1px
          ),
          linear-gradient(
            90deg,
            rgba(42, 33, 23, 0.025),
            transparent 40%,
            rgba(42, 33, 23, 0.025)
          );
        background-size:
          22px 22px,
          auto;
      }

      &[data-theme-pack='aurora'][data-theme-mode='light'] main {
        background-color: #effefa;
        background-image:
          radial-gradient(
            circle at 18% 20%,
            rgba(15, 159, 142, 0.18),
            transparent 34%
          ),
          radial-gradient(
            circle at 82% 8%,
            rgba(124, 58, 237, 0.14),
            transparent 30%
          );
      }

      &[data-theme-pack='polaroid'][data-theme-mode='light'] main {
        background-color: #eadfcf;
        background-image: radial-gradient(
          circle at 50% 10%,
          rgba(255, 255, 255, 0.44),
          transparent 34%
        );
      }

      &[data-theme-pack='blueprint'][data-theme-mode='light'] {
        background-color: #eaf8ff;
        background-image:
          linear-gradient(rgba(2, 132, 168, 0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(2, 132, 168, 0.12) 1px, transparent 1px);
        background-size: 28px 28px;
        font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
      }

      &[data-theme-pack='neon'][data-theme-mode='light'] {
        background-color: #f7f5ff;
        background-image:
          radial-gradient(
            circle at 15% 20%,
            rgba(192, 38, 211, 0.16),
            transparent 31%
          ),
          radial-gradient(
            circle at 90% 8%,
            rgba(8, 145, 178, 0.16),
            transparent 29%
          ),
          linear-gradient(135deg, rgba(124, 58, 237, 0.08), transparent 48%);
        font-family: 'Inter', system-ui, sans-serif;
      }

      &[data-theme-pack='paper'][data-theme-mode='light'] {
        background-color: #f5ecd9;
        background-image:
          radial-gradient(
            circle at 20% 30%,
            rgba(42, 33, 23, 0.055) 0 1px,
            transparent 1px
          ),
          linear-gradient(
            90deg,
            rgba(42, 33, 23, 0.025),
            transparent 40%,
            rgba(42, 33, 23, 0.025)
          );
        background-size:
          22px 22px,
          auto;
        font-family: Georgia, 'Times New Roman', serif;
      }

      &[data-theme-pack='bauhaus'][data-theme-mode='light'] {
        background-color: #fff1b8;
        background-image: var(--app-bg-image);
        font-family: Arial, Helvetica, sans-serif;
      }

      &[data-theme-pack='aurora'][data-theme-mode='light'] {
        background-color: #effefa;
        background-image:
          radial-gradient(
            circle at 18% 20%,
            rgba(15, 159, 142, 0.18),
            transparent 34%
          ),
          radial-gradient(
            circle at 82% 8%,
            rgba(124, 58, 237, 0.14),
            transparent 30%
          );
      }

      &[data-theme-pack='polaroid'][data-theme-mode='light'] {
        background-color: #eadfcf;
        background-image: radial-gradient(
          circle at 50% 10%,
          rgba(255, 255, 255, 0.44),
          transparent 34%
        );
      }
    `}
  >
    <a
      href="#gallery-main"
      css={`
        ${srOnlyCss}
        &:focus {
          position: fixed;
          top: 12px;
          left: 12px;
          z-index: 2000;
          width: auto;
          height: auto;
          margin: 0;
          padding: 10px 14px;
          clip: auto;
          overflow: visible;
          white-space: nowrap;
          background: var(--accent);
          color: var(--accent-contrast);
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          box-shadow: var(--glow);
        }
      `}
    >
      Skip to gallery
    </a>
    <GlobalStyles />
    <style>
      {`
        body {
          margin: 0;
          background-color: var(--bg-primary);
          background-image: var(--app-bg-image);
          background-size: var(--bg-size);
          font-family: var(--font-ui);
        }
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: var(--scrollbar-thumb);
          border-radius: var(--radius-round);
        }
        @keyframes lightbox-enter {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}
    </style>
    {children}
  </div>
)
