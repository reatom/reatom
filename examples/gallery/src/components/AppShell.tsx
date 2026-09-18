import type { JSX } from '@reatom/jsx'

import { srOnlyCss } from '../a11y'
import {
  glassBackgroundAnimation,
  resolvedThemeMode,
  themePack,
} from '../model'
import { activeThemeVariables, GlobalStyles } from '../theme'
import { BlueprintFooter, blueprintDetailsCss } from './BlueprintDetails'
import { obsidianCss, ObsidianFooter } from './ObsidianDetails'
import { bauhausCss } from './BauhausTheme'
import { glassDetailsCss } from './GlassDetails'
import { polaroidDetailsCss } from './PolaroidDetails'
import { retroDetailsCss } from './RetroDetails'
import { paperDetailsCss } from './PaperDetails'
import { minimalDetailsCss } from './MinimalDetails'
import { themeViewerCss } from './ThemeViewerDetails'
import { bindGlassSurfaces } from '../glassSurfaces'
import { GlassBackground } from './GlassBackground'
import { GlassFilters } from './GlassFilters'

export const AppShell = ({ children }: { children: JSX.ElementChildren }) => (
  <div
    ref={bindGlassSurfaces}
    attr:data-theme-pack={themePack}
    attr:data-glass-animation={glassBackgroundAnimation}
    attr:data-glass-refraction={/Chrome\/|Chromium\//.test(navigator.userAgent)}
    attr:data-theme-mode={resolvedThemeMode}
    style={() => activeThemeVariables()}
    css={`
      ${bauhausCss}
      ${glassDetailsCss}
      ${polaroidDetailsCss}
      ${retroDetailsCss}
      ${themeViewerCss}
      ${paperDetailsCss}
      ${blueprintDetailsCss}
      ${obsidianCss}
      ${minimalDetailsCss}
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
    <GlassBackground />
    <GlassFilters />
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
    <BlueprintFooter />
    <ObsidianFooter />
  </div>
)
