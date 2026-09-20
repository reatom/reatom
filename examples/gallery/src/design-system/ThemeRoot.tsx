import type { JSX } from '@reatom/jsx'

import { bauhausCss } from '../components/BauhausTheme'
import { blueprintDetailsCss } from '../components/BlueprintDetails'
import { cartoonDetailsCss } from '../components/CartoonTheme'
import { GlassBackground } from '../components/GlassBackground'
import { glassDetailsCss } from '../components/GlassDetails'
import { GlassFilters } from '../components/GlassFilters'
import { minimalDetailsCss } from '../components/MinimalDetails'
import { obsidianCss } from '../components/ObsidianDetails'
import { paperDetailsCss } from '../components/PaperDetails'
import { polaroidDetailsCss } from '../components/PolaroidDetails'
import { retroDetailsCss } from '../components/RetroDetails'
import { themeViewerCss } from '../components/ThemeViewerDetails'
import { bindGlassSurfaces } from '../glassSurfaces'
import {
  glassBackgroundAnimation,
  resolvedThemeMode,
  themePack,
} from '../model'
import type { ResolvedThemeMode, ThemePack } from '../types'
import { bindControlRecipe } from './controls/controlStyles'
import { bindDocumentStyles, bindThemeFonts } from './documentStyles'
import { resolveThemeCssVars } from './themes/registry'
import { OPTIONAL_DECORATIVE_TOKEN_KEYS } from './themeTypes'

const clearedOptionalTokens = Object.fromEntries(
  OPTIONAL_DECORATIVE_TOKEN_KEYS.map((key) => [key, '']),
) as Record<(typeof OPTIONAL_DECORATIVE_TOKEN_KEYS)[number], string>

export type ThemeRootProps = {
  children: JSX.ElementChildren
  pack?: ThemePack | (() => ThemePack)
  mode?: ResolvedThemeMode | (() => ResolvedThemeMode)
  includeAtmosphere?: boolean
  bindDocument?: boolean
  css?: string
}

const resolvePack = (
  pack: ThemePack | (() => ThemePack) | undefined,
): ThemePack => {
  if (typeof pack === 'function') return pack()
  return pack ?? themePack()
}

const resolveMode = (
  mode: ResolvedThemeMode | (() => ResolvedThemeMode) | undefined,
): ResolvedThemeMode => {
  if (typeof mode === 'function') return mode()
  return mode ?? resolvedThemeMode()
}

const supportsGlassRefraction = /Chrome\/|Chromium\//.test(navigator.userAgent)

const themeBoundaryCss = `
  --sidebar-width: 240px;
  --folder-toggle-size: 34px;
  --folder-header-rail-height: 40px;

  &, *, *::before, *::after {
    box-sizing: border-box;
  }

  :where(h1, h2, h3, h4, h5, h6, p, ul, ol, figure) {
    margin: 0;
  }

  :where(button:not([data-ui])) {
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
  }

  ${bauhausCss}
  ${cartoonDetailsCss}
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
  background: var(--bg-primary);
  background-image: var(--app-bg-image);
  background-size: var(--bg-size);
  color: var(--text-primary);
  font-family: var(--font-ui);
  transition: background 0.3s, color 0.3s;

  a {
    color: var(--accent);
    text-decoration: none;
  }

  input, select, textarea {
    font-family: inherit;
    font-size: inherit;
    outline: none;
  }

  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    box-shadow: 0 0 0 3px var(--focus-ring);
  }

  ::selection {
    background: var(--accent-soft);
    color: var(--text-primary);
  }

  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: var(--radius-round);
  }
  ::-webkit-scrollbar-thumb:hover { background: var(--accent); }

  &[data-theme-pack='terminal'] {
    letter-spacing: 0.01em;
  }

  &[data-theme-pack='terminal'][data-theme-mode='light'] main {
    background-color: #f4f6ef;
    background-image:
      linear-gradient(rgba(15, 107, 58, 0.055) 50%, transparent 50%),
      linear-gradient(90deg, rgba(15, 107, 58, 0.03) 1px, transparent 1px);
    background-size: 100% 4px, 22px 22px;
  }

  &[data-theme-pack='terminal'] input {
    border-radius: 0;
  }

  &[data-theme-pack='terminal'] [data-terminal-bracket='true'] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25em;
  }

  &[data-theme-pack='terminal'] [data-terminal-bracket='true']::before {
    content: '[';
    color: var(--text-muted);
  }

  &[data-theme-pack='terminal'] [data-terminal-bracket='true']::after {
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
`

export const ThemeRoot = ({
  children,
  pack,
  mode,
  includeAtmosphere = false,
  bindDocument = false,
  css = '',
}: ThemeRootProps) => (
  <div
    ref={(node) => {
      bindThemeFonts()
      bindControlRecipe()
      if (bindDocument) bindDocumentStyles()
      return bindGlassSurfaces(node)
    }}
    attr:data-theme-pack={() => resolvePack(pack)}
    attr:data-theme-mode={() => resolveMode(mode)}
    attr:data-glass-animation={glassBackgroundAnimation}
    attr:data-glass-refraction={supportsGlassRefraction}
    style={() => ({
      ...clearedOptionalTokens,
      ...resolveThemeCssVars(resolvePack(pack), resolveMode(mode)),
    })}
    css={`
      ${themeBoundaryCss}${css}
    `}
  >
    {includeAtmosphere ? <GlassBackground /> : null}
    <GlassFilters />
    {children}
  </div>
)
