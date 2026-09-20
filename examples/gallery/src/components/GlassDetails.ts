import {
  crystalChipCss,
  crystalRimCss,
  crystalSurfaceCss,
} from './CrystalMaterial'

/**
 * A neutral liquid-glass material. Text sits above optical layers, never inside
 * filters.
 */
export const glassDetailsCss = `
  &[data-theme-pack='glass'] {
    color-scheme: light;
    position: relative;
    isolation: isolate;
    --liquid-fill: rgba(255, 255, 255,.20);
    --liquid-edge: #58617430;
    --liquid-control: rgba(255, 255, 255,.48);
    --liquid-rim: rgba(255, 255, 255,.72);
    --liquid-ink: #202020;
    --liquid-muted: #4e4e4e;
    --liquid-shadow: 0 8px 22px #35353520, 0 2px 5px #35353512;
    --liquid-solid: #ebebeb;
    --text-primary: var(--liquid-ink);
    --text-secondary: var(--liquid-muted);
    --text-muted: var(--liquid-muted);
    --accent: #666666;
    --accent-hover: #515151;
    --accent-contrast: #fff;
    --active-bg: #dddddd52;
    --hover-bg: #ffffff45;
    --input-bg: #ffffff20;
    --input-border: #58617425;
    --panel-bg: var(--liquid-fill);
    --surface-glass: var(--liquid-fill);
    --surface-strong: var(--liquid-fill);
    --card-bg: transparent;
    --card-border: #ffffff66;
    --border: #89898933;
    --border-strong: #ffffffaa;
    --surface-bg-image: none;
    --glow: none;
    --card-hover-transform: none;
    --selected-shadow: 0 0 0 2px #fff, 0 0 0 5px var(--accent);
    --card-hover-shadow: 0 0 0 1px #ffffffaa;
    --toolbar-backdrop-filter: none;
    --panel-backdrop-filter: blur(20px) saturate(1.25);
    --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #e4e4e4;
    background-image: linear-gradient(135deg, #e3e6eb, #cbd1da 55%, #e1e4e8);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    &[data-theme-mode='dark'] {
      color-scheme: dark;
      --crystal-rim-opacity: .65;
      --liquid-fill: rgba(28, 32, 40,.28);
      --liquid-edge: #ffffff24;
      --liquid-control: rgba(229, 229, 229,.10);
      --liquid-rim: rgba(255, 255, 255,.38);
      --liquid-ink: #f5f5f5;
      --liquid-muted: #d5d5d5;
      --liquid-shadow: 0 10px 28px #0004, 0 2px 5px #0002;
      --liquid-solid: #2b2b2b;
      --accent: #c9c9c9;
      --accent-hover: #dddddd;
      --accent-contrast: #242424;
      --active-bg: #d2d2d228;
      --hover-bg: #ffffff15;
      --input-bg: #ffffff0d;
      --input-border: #ffffff32;
      --border: #ffffff22;
      background: #343434;
      background-image: linear-gradient(135deg, #343b47, #242a33 55%, #3d4550);
      background-size: cover;
      background-position: center;
    }
    #gallery-toolbar, #gallery-folder-sidebar, aside[role='dialog'] {
      position: relative;
      ${crystalSurfaceCss}
      -webkit-backdrop-filter: blur(20px) saturate(1.15);
      backdrop-filter: blur(20px) saturate(1.15);
    }
    &[data-glass-refraction='true'] #gallery-toolbar,
    &[data-glass-refraction='true'] #gallery-folder-sidebar,
    &[data-glass-refraction='true'] aside[role='dialog'] {
      backdrop-filter: var(--glass-optics, blur(8px)) blur(1.5px);
    }
    &[data-glass-refraction='true'] aside[role='dialog'] {
      backdrop-filter: var(--glass-optics, blur(8px)) blur(10px);
    }
    #gallery-toolbar::after, #gallery-folder-sidebar::after {
      ${crystalRimCss}
    }
    #gallery-toolbar {
      margin: 12px 12px 8px;
      padding: 12px 20px;
      min-height: 72px;
      border-radius: 34px;
      gap: 14px;
      overflow-x: auto;
    }
    #gallery-brand { font-size: 22px; font-weight: 650; letter-spacing: -.7px; gap: 9px; }
    #gallery-brand > span:first-child {
      background: transparent; color: var(--text-primary); box-shadow: none;
      border-radius: 0; width: 25px; height: 25px;
    }
    #gallery-toolbar input {
      border-radius: 999px;
      min-height: 38px;
      font-weight: 500;
    }
    #gallery-toolbar [data-ui='button'] { min-height: 38px; }
    #gallery-toolbar [data-ui='button']:has(svg) {
      width: 38px;
      height: 38px;
      font-size: 17px;
    }
    #gallery-toolbar input {
      width: 205px; padding-left: 34px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      box-shadow: inset 0 1px 3px #18233312;
    }
    #gallery-toolbar [role='group'] {
      padding: 3px; gap: 3px; border-radius: 24px;
      background: #ffffff18;
      box-shadow: inset 0 1px 3px #18233312;
    }
    #gallery-pathbar [data-ui='button'] { min-height: 30px; padding: 5px 12px; font-size: 11px; }
    #gallery-workspace {
      position: relative; gap: 12px;
      margin: 0 12px 12px; padding: 8px 0 0;
      border-radius: 0;
      border: 0;
      box-shadow: none;
      background: transparent;
    }

    #gallery-folder-sidebar {
      border-radius: 28px;
      padding: 16px 12px;
      overflow-y: auto;
      overflow-x: hidden;
    }
    #gallery-folder-sidebar [role='treeitem'] { padding: 9px 12px; border-radius: 18px; }
    #gallery-folder-sidebar [role='treeitem'][data-selected='true'] {
      ${crystalChipCss}
    }
    #gallery-folder-sidebar [role='treeitem'] svg { color: var(--accent); }
    #gallery-pathbar { padding: 0 6px 12px; border: 0; background: none; backdrop-filter: none; gap: 10px; }
    main { padding: 4px 6px 8px; margin: 0; background: transparent; border: 0; box-shadow: none; border-radius: 0; }
    [data-gap] {
      border-radius: 16px; padding: 0; border: 0;
      background: #ffffff0c; box-shadow: 0 3px 10px #23232316;
    }
    [data-gap][data-gap='none'] { border: 0; border-radius: 0; }
    > div:first-of-type { border-radius: inherit; }
    [data-gap] [data-caption] {
      right: 0; left: 0; bottom: 0;
      padding: 24px 14px 12px;
      border: 0; border-radius: 0;
      background: linear-gradient(transparent, #00000085);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
      box-shadow: none;
    }
    [data-gap] [data-caption] > div { color: #fff; text-shadow: 0 1px 3px #0008; }
    aside[role='dialog'] {
      --glass-panel-radius: 34px;
      position: fixed;
      top: 12px; right: 12px; bottom: 12px; height: auto;
      border-radius: var(--glass-panel-radius);
      clip-path: none;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 12px;
      background: color-mix(in srgb, var(--liquid-solid) 78%, transparent);
    }
    aside[role='dialog']:not([data-open='true']) { box-shadow: none; right: -24px; }
    input:focus:not(:focus-visible) {
      outline: none;
    }
    input:is([type='search'], [type='number']):focus {
      border-color: #0867d5;
      outline: 2px solid #0867d5;
      outline-offset: 2px;
      box-shadow: 0 0 0 2px #fff;
    }
    aside[aria-label='Filters'] {
      --glass-panel-radius: 26px;
      top: 92px; bottom: auto;
      width: min(340px, calc(100vw - 24px));
      max-height: calc(100dvh - 104px);
    }
    aside[aria-label='Filters'] input:is([type='search'], [type='number']) {
      min-width: 0;
      min-height: 36px;
      border-radius: 12px;
    }
    aside[aria-label='Filters'] input[type='checkbox'] { accent-color: #0867d5; }
    @media (max-width: 1000px) {
      aside[aria-label='Filters'] { top: 12px; max-height: calc(100dvh - 24px); }
    }
    @media (prefers-contrast: more), (forced-colors: active) {
      &, &[data-theme-mode='dark'] { background-image: none; }
      #gallery-workspace::after, #gallery-toolbar::after, #gallery-folder-sidebar::after { display: none; }
      #gallery-toolbar, #gallery-folder-sidebar, aside[role='dialog'],
      [data-gap] [data-caption] {
        background: Canvas; color: CanvasText; border-color: CanvasText;
        -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
      }
      [data-gap] [data-caption] > div { color: CanvasText; text-shadow: none; }
      input:focus-visible,
      input:is([type='search'], [type='number']):focus {
        outline: 2px solid Highlight;
        outline-offset: 3px;
        box-shadow: none;
      }
    }
    @media (max-width: 1000px) {
      #gallery-toolbar { flex-wrap: wrap; gap: 8px; padding: 10px 14px; }
    }
    @media (max-width: 600px) {
      #gallery-toolbar { margin: 8px; border-radius: 24px; }
      #gallery-toolbar > div:has(input) { order: 2; flex: 1 0 100%; }
      #gallery-toolbar > div:has(input) > div, #gallery-toolbar input { width: 100%; }
      #gallery-toolbar > div:empty { display: none; }
      #gallery-workspace { margin: 0 8px 8px; padding: 6px; gap: 8px; }
    }
    @media (prefers-reduced-transparency: reduce) {
      &, &[data-theme-mode='dark'] { background-image: none; }
      #gallery-workspace::after, #gallery-toolbar::after, #gallery-folder-sidebar::after { display: none; }
      #gallery-toolbar, #gallery-folder-sidebar, aside[role='dialog'] { background: var(--liquid-solid); -webkit-backdrop-filter: none; backdrop-filter: none !important; }
      [data-gap] [data-caption] { background: #2f2f2f; -webkit-backdrop-filter: none; backdrop-filter: none !important; }
    }
    @media (prefers-reduced-motion: reduce) {
      [data-gap] { transition: none; }
    }
    @supports not (backdrop-filter: blur(1px)) {
      #gallery-toolbar, #gallery-folder-sidebar, aside[role='dialog'] { background: var(--liquid-solid); }
      [data-gap] [data-caption] { background: #2f2f2f; }
    }
  }
`
