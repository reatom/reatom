import bangersFont from '../assets/Bangers-Regular.ttf?url'
import type { ThemeVariables } from '../design-system/themeTypes'
import type { ResolvedThemeMode } from '../types'

// Bundled with its OFL license so the comic lettering also works offline.
export const cartoonFontCss = `
  @font-face {
    font-family: 'Gallery Bangers';
    src: url('${bangersFont}') format('truetype');
    font-style: normal;
    font-weight: 400;
    font-display: swap;
  }
`

const common = {
  '--font-ui': '"Gallery Bangers", "Impact", sans-serif',
  '--accent': 'var(--text-primary)',
  '--accent-hover': 'var(--text-secondary)',
  '--accent-soft': 'var(--hover-bg)',
  '--accent-contrast': 'var(--bg-secondary)',
  '--surface-glass': 'var(--bg-secondary)',
  '--surface-strong': 'var(--bg-secondary)',
  '--card-bg': 'var(--bg-secondary)',
  '--card-border': 'var(--text-primary)',
  '--border': 'var(--text-primary)',
  '--border-strong': 'var(--text-primary)',
  '--toolbar-bg': 'var(--bg-secondary)',
  '--panel-bg': 'var(--bg-secondary)',
  '--input-bg': 'var(--bg-secondary)',
  '--input-border': 'var(--text-primary)',
  '--scrollbar-thumb': 'var(--text-muted)',
  '--shadow': '#000000',
  '--shadow-strong': '#000000',
  '--focus-ring': 'var(--text-primary)',
  '--radius-xs': '6px',
  '--radius-sm': '12px',
  '--radius-md': '18px',
  '--radius-lg': '24px',
  '--radius-xl': '30px',
  '--radius-round': '999px',
  '--hero-glow-1': 'transparent',
  '--hero-glow-2': 'transparent',
  '--overlay-bg': '#101010f5',
  '--overlay-control': '#333333',
  '--overlay-control-hover': '#555555',
  '--viewer-fg': '#ffffff',
  '--viewer-bg': 'var(--overlay-control)',
  '--viewer-bg-hover': 'var(--overlay-control-hover)',
  '--viewer-border': 'rgba(255, 255, 255, 0.12)',
  '--image-overlay': '#00000000',
  '--app-bg-image': 'none',
  '--surface-bg-image': 'none',
  '--card-bg-image': 'none',
  '--bg-size': 'auto',
  '--surface-bg-size': 'auto',
  '--border-width': '3px',
  '--border-style': 'solid',
  '--control-border-style': 'solid',
  '--card-frame-width': '0px',
  '--card-padding': '0px',
  '--card-hover-transform': 'translateY(-2px)',
  '--card-hover-shadow': '3px 7px 0 var(--text-primary)',
  '--selected-shadow':
    '0 0 0 3px var(--bg-secondary), 0 0 0 6px var(--text-primary)',
  '--glow': '2px 3px 0 var(--text-primary)',
  '--toolbar-backdrop-filter': 'none',
  '--panel-backdrop-filter': 'none',
  '--surface-clip-path': 'none',
  '--control-transform': 'uppercase',
}

export const cartoonTheme = {
  light: {
    ...common,
    '--bg-primary': '#101010',
    '--bg-secondary': '#ffffff',
    '--bg-tertiary': '#eeeeee',
    '--bg-elevated': '#ffffff',
    '--text-primary': '#111111',
    '--text-secondary': '#333333',
    '--text-muted': '#555555',
    '--hover-bg': '#e8e8e8',
    '--active-bg': '#dedede',
  },
  dark: {
    ...common,
    '--bg-primary': '#080808',
    '--bg-secondary': '#202020',
    '--bg-tertiary': '#303030',
    '--bg-elevated': '#292929',
    '--text-primary': '#f4f4f4',
    '--text-secondary': '#dddddd',
    '--text-muted': '#bdbdbd',
    '--hover-bg': '#373737',
    '--active-bg': '#484848',
  },
} satisfies Record<ResolvedThemeMode, ThemeVariables>

export const cartoonDetailsCss = `
  &[data-theme-pack='cartoon'] {
    font-weight: 400;
    letter-spacing: .035em;
    padding: 6px;
    gap: 12px;

    input, h2, #gallery-brand { font-weight: 400; }
    input, select, textarea { font-family: var(--font-ui); }
    input:focus-visible, [tabindex='0']:focus-visible {
      outline: 2px dashed var(--text-primary);
      outline-offset: 4px;
    }
    svg { stroke-width: 2.4; flex-shrink: 0; }

    #gallery-toolbar {
      min-height: 70px;
      padding: 8px 20px;
      border: 3px solid var(--text-primary);
      border-radius: 44px 40px 42px 38px;
      box-shadow: 0 3px 0 #000;
      gap: 10px;
    }
    #gallery-brand { font-size: 32px; letter-spacing: 0; gap: 10px; }
    #gallery-brand > span:first-child {
      background: none;
      color: var(--text-primary);
      box-shadow: none;
      border-radius: 0;
      width: 28px;
      height: 30px;
    }
    #gallery-brand svg { width: 25px; height: 25px; }
    #gallery-toolbar [data-ui='button'], #gallery-pathbar [data-ui='button'] {
      font-size: 17px;
      letter-spacing: .025em;
      padding: 6px 9px;
    }
    #gallery-toolbar [role='group'] {
      border: 3px solid var(--text-primary);
      border-radius: 30px;
      padding: 2px;
      gap: 2px;
      box-shadow: 2px 3px 0 var(--text-primary);
    }
    #gallery-toolbar [role='group'] [data-ui='button'] {
      border-radius: 50%;
      width: 34px;
      height: 34px;
      padding: 6px;
    }
    #gallery-toolbar > div:last-child [data-ui='button'] { width: 36px; height: 36px; font-size: 22px; }
    #gallery-pathbar nav { font-size: 21px; }
    #gallery-pathbar nav span { font-size: inherit; font-weight: 400; }
    #gallery-pathbar [data-ui='button'] { font-size: 16px; padding: 4px 8px; border-radius: 22px; }
    #gallery-toolbar input {
      width: 210px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      border-radius: 28px;
      padding-top: 9px;
      padding-bottom: 9px;
      box-shadow: 2px 3px 0 var(--text-primary);
    }
    #gallery-workspace { gap: 14px; padding: 0 4px 8px; }
    #gallery-workspace > div:last-child {
      position: relative;
      isolation: isolate;
      background: var(--bg-secondary);
      border-radius: 24px 20px 28px 18px;
      border: 3px solid var(--text-primary);
    }
    /* Dot screen fades toward the content; photographs stay untouched. */
    #gallery-workspace > div:last-child::before,
    #gallery-folder-sidebar::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      border-radius: inherit;
      background: radial-gradient(circle, var(--text-primary) 1px, transparent 1.3px) 0 0 / 5px 5px;
      mask-image: linear-gradient(145deg, transparent 45%, #000 100%);
    }
    #gallery-pathbar {
      min-height: 50px;
      padding: 4px 12px;
      background: transparent;
      border: 0;
      gap: 6px;
      font-size: 21px;
    }
    main { background: transparent; padding: 4px 10px 18px; }
    #gallery-folder-sidebar {
      position: relative;
      isolation: isolate;
      border: 3px solid var(--text-primary);
      border-radius: 26px 22px 28px 24px;
      box-shadow: inset 0 0 0 3px var(--bg-secondary), inset 0 0 0 5px var(--text-primary);
      padding: 14px 10px;
    }
    #gallery-folder-sidebar::before {
      inset: 7px;
      background-size: 4px 4px;
      mask-image: linear-gradient(165deg, transparent 20%, #000 95%);
    }
    #gallery-folder-sidebar [role='treeitem'] {
      font-size: 18px;
      font-weight: 400;
      min-height: 42px;
      border: 2px solid transparent;
      background: var(--panel-bg);
    }
    #gallery-folder-sidebar [aria-selected='true'] {
      border-color: var(--text-primary);
      border-radius: 24px 20px 22px 18px;
      box-shadow: 2px 4px 0 var(--text-primary);
      color: var(--text-primary);
      background: var(--panel-bg);
    }
    [data-gap]:not([data-gap='none']) {
      border-radius: 17px 19px 16px 20px;
      box-shadow: 2px 5px 0 var(--text-primary);
    }
    [data-gap]:not([data-gap='none']):hover {
      box-shadow: var(--card-hover-shadow);
    }
    [data-gap][data-selected='true'] { box-shadow: var(--selected-shadow); }
    [data-caption] { background: transparent; padding: 10px 8px; }
    [data-caption] > div {
      color: #111;
      font-size: 19px;
      font-weight: 400;
      letter-spacing: .025em;
      -webkit-text-stroke: 4px white;
      paint-order: stroke fill;
      text-shadow: 0 2px 0 white;
      line-height: 1.3;
    }
    [data-caption] > div + div { font-size: 15px; color: #111; }
    aside[role='dialog'] {
      border-left: 4px solid var(--text-primary);
      box-shadow: -6px 0 0 #000;
      max-width: 100vw;
      h2 { font-size: 26px; letter-spacing: .035em; }
      h3 { margin-top: 22px; margin-bottom: 12px; }
      [data-ui='button'][data-ui-role='choice'] { padding: 10px 14px; }
      label:has([data-ui='switch']) { padding: 14px 2px; }
    }
    #gallery-lightbox {
      #lightbox-toolbar > span { font-size: 20px; }
    }
    @media (max-width: 700px) {
      padding: 4px;
      gap: 8px;
      #gallery-toolbar { padding: 8px 12px; min-height: 62px; }
      #gallery-workspace { gap: 8px; padding: 0 0 4px; }
      #gallery-pathbar { flex-wrap: wrap; padding: 8px 12px; }
      main { padding: 4px 8px 14px; }
    }
    @media (prefers-reduced-motion: reduce) {
      [data-gap] { transition: none; }
      [data-gap]:hover { transform: none; }
    }
  }
`
