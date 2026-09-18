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
    .glass-scene { display: none; }
    .gallery-toolbar, .gallery-folder-sidebar, aside[role='dialog'] {
      position: relative;
      ${crystalSurfaceCss}
      -webkit-backdrop-filter: blur(20px) saturate(1.15);
      backdrop-filter: blur(20px) saturate(1.15);
    }
    &[data-glass-refraction='true'] .gallery-toolbar,
    &[data-glass-refraction='true'] .gallery-folder-sidebar,
    &[data-glass-refraction='true'] aside[role='dialog'] {
      backdrop-filter: var(--glass-optics, blur(8px)) blur(1.5px);
    }
    &[data-glass-refraction='true'] aside[role='dialog'] {
      backdrop-filter: var(--glass-optics, blur(8px)) blur(10px);
    }
    .gallery-toolbar::after, .gallery-folder-sidebar::after {
      ${crystalRimCss}
    }
    .gallery-toolbar {
      margin: 12px 12px 8px;
      padding: 12px 20px;
      min-height: 72px;
      border-radius: 34px;
      gap: 14px;
      overflow-x: auto;
    }
    .gallery-brand { font-size: 22px; font-weight: 650; letter-spacing: -.7px; gap: 9px; }
    .gallery-brand > span {
      background: transparent; color: var(--text-primary); box-shadow: none;
      border-radius: 0; width: 25px; height: 25px;
    }
    .gallery-toolbar button, .gallery-toolbar input, .gallery-pathbar button {
      background: transparent;
      color: var(--text-primary);
      border: 1px solid transparent;
      border-radius: 999px;
      box-shadow: none;
      min-height: 38px;
      font-weight: 500;
      transition: background 160ms, box-shadow 160ms, transform 120ms, filter 160ms;
    }
    .gallery-toolbar button:has(svg) { width: 38px; font-size: 17px; }
    .gallery-toolbar input {
      width: 205px; padding-left: 34px;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      box-shadow: inset 0 1px 3px #18233312;
    }
    .gallery-toolbar [role='group'] {
      padding: 3px; gap: 3px; border-radius: 24px;
      background: #ffffff18;
      box-shadow: inset 0 1px 3px #18233312;
    }
    .gallery-toolbar button[aria-pressed='true'],
    .gallery-toolbar [aria-pressed='true'],
    .gallery-pathbar button[data-active='true'] {
      ${crystalChipCss}
    }
    .gallery-toolbar button[aria-expanded='true'] { ${crystalChipCss} }
    .gallery-toolbar button:active:not(:disabled),
    .gallery-pathbar button:active:not(:disabled),
    .glass-lens:active:not(:disabled) {
      transform: scale(0.98);
      box-shadow: var(--glass-lens-shadow, inset 0 0 14px #fff6);
    }
    @media (hover: hover) and (pointer: fine) {
      .gallery-toolbar button:hover:not(:disabled):not([aria-pressed='true']),
      .gallery-pathbar button:hover:not(:disabled),
      .glass-lens:hover:not(:disabled):not([aria-pressed='true']):not([data-active='true']) {
        background: var(--hover-bg);
      }
    }
    .gallery-workspace {
      position: relative; gap: 12px;
      margin: 0 12px 12px; padding: 8px 0 0;
      border-radius: 0;
      border: 0;
      box-shadow: none;
      background: transparent;
    }

    .gallery-folder-sidebar {
      border-radius: 28px;
      padding: 16px 12px;
      overflow-y: auto;
      overflow-x: hidden;
    }
    .gallery-folder-sidebar [role='treeitem'] { padding: 9px 12px; border-radius: 18px; }
    .gallery-folder-sidebar [role='treeitem'][data-selected='true'] {
      ${crystalChipCss}
    }
    .gallery-folder-sidebar [role='treeitem'] svg { color: var(--accent); }
    .gallery-pathbar { padding: 0 6px 12px; border: 0; background: none; backdrop-filter: none; gap: 10px; }
    .gallery-pathbar button { min-height: 30px; padding: 5px 12px; font-size: 11px; }
    main { padding: 4px 6px 8px; margin: 0; background: transparent; border: 0; box-shadow: none; border-radius: 0; }
    .glass-card {
      border-radius: 16px; padding: 0; border: 0;
      background: #ffffff0c; box-shadow: 0 3px 10px #23232316;
    }
    .glass-card[data-gap='none'] { border: 0; border-radius: 0; }
    .grid-image-preview { border-radius: inherit; }
    .glass-card .grid-image-caption {
      right: 0; left: 0; bottom: 0;
      padding: 24px 14px 12px;
      border: 0; border-radius: 0;
      background: linear-gradient(transparent, #00000085);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
      box-shadow: none;
    }
    .glass-card .grid-image-caption > div { color: #fff; text-shadow: 0 1px 3px #0008; }
    /* Fixed-size optical primitive: its map matches the rendered circle. */
    .glass-card .glass-overlay-control {
      width: 30px; height: 30px; border-radius: 50%;
      background:
        var(--glass-refraction-target, none),
        #2020203d;
      color: white;
      border: 1px solid #ffffff40;
      -webkit-backdrop-filter: blur(8px) saturate(1.2);
      backdrop-filter: blur(8px) saturate(1.2);
      box-shadow:
        inset 1px 0 4px var(--glass-chroma-cyan, transparent),
        inset -1px 0 4px var(--glass-chroma-violet, transparent),
        inset 0 1px 0 #ffffff60,
        0 2px 6px #0003;
    }
    .glass-card .glass-overlay-control[aria-pressed='true'] { color: #c8c8c8; }
    .glass-card .glass-overlay-control:active:not(:disabled) { transform: scale(0.94); }
    .glass-card:focus-within .grid-image-overlay { opacity: 1; }
    aside[role='dialog'] {
      position: fixed;
      top: 12px; right: 12px; bottom: 12px; height: auto;
      border-radius: 34px;
      padding: 24px;
      background: color-mix(in srgb, var(--liquid-solid) 78%, transparent);
    }
    aside[role='dialog']:not([data-open='true']) { box-shadow: none; right: -24px; }
    aside[role='dialog'] .glass-lens {
      background: transparent;
      border-color: var(--border);
      box-shadow: none;
    }
    aside[role='dialog'] [data-glass-toggle='true'] {
      background: color-mix(in srgb, var(--liquid-ink) 16%, transparent);
      border-color: var(--liquid-edge);
      box-shadow: inset 0 1px 3px #0002;
    }
    aside[role='dialog'] [data-glass-toggle='true'][aria-checked='true'] {
      background: #248a4b;
      border-color: #167139;
    }
    aside[role='dialog'] [data-glass-toggle='true']::after {
      background: linear-gradient(#fff, #e9edef);
      box-shadow: inset 0 1px 0 #fff, 0 1px 3px #0003;
    }
    aside[role='dialog'] .glass-lens[aria-pressed='true'],
    aside[role='dialog'] .glass-lens[data-active='true'] {
      ${crystalChipCss}
      border-color: color-mix(in srgb, var(--liquid-ink) 30%, transparent);
      font-weight: 600;
    }
    button:focus:not(:focus-visible),
    input:focus:not(:focus-visible) {
      outline: none;
    }
    /* Keep focus independent of the neutral accent and the material shadow. */
    button:focus-visible, input:focus-visible {
      outline: 2px solid #0867d5;
      outline-offset: 2px;
      box-shadow: 0 0 0 2px #fff;
    }
    input:is([type='search'], [type='number']):focus {
      border-color: #0867d5;
      outline: 2px solid #0867d5;
      outline-offset: 2px;
      box-shadow: 0 0 0 2px #fff;
    }
    aside[aria-label='Filters'] {
      top: 92px; bottom: auto;
      width: min(340px, calc(100vw - 24px));
      max-height: calc(100dvh - 104px);
      border-radius: 26px;
    }
    aside[aria-label='Filters'] .filter-type-options {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 4px 8px;
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
    &[data-glass-refraction='true'] .glass-card .glass-overlay-control {
      backdrop-filter: url(#glass-circleSmall) blur(1px) saturate(1.15);
    }
    @media (prefers-contrast: more), (forced-colors: active) {
      &, &[data-theme-mode='dark'] { background-image: none; }
      .gallery-workspace::after, .gallery-toolbar::after, .gallery-folder-sidebar::after { display: none; }
      .gallery-toolbar, .gallery-folder-sidebar, aside[role='dialog'],
      .glass-card .grid-image-caption, .glass-card .glass-overlay-control {
        background: Canvas; color: CanvasText; border-color: CanvasText;
        -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
      }
      .glass-card .grid-image-caption > div { color: CanvasText; text-shadow: none; }
      button:focus-visible, input:focus-visible,
      input:is([type='search'], [type='number']):focus {
        outline: 2px solid Highlight;
        outline-offset: 3px;
        box-shadow: none;
      }
    }
    @media (max-width: 1000px) {
      .gallery-toolbar { flex-wrap: wrap; gap: 8px; padding: 10px 14px; }
    }
    @media (max-width: 600px) {
      .gallery-toolbar { margin: 8px; border-radius: 24px; }
      .gallery-toolbar > div:has(input) { order: 2; flex: 1 0 100%; }
      .gallery-toolbar > div:has(input) > div, .gallery-toolbar input { width: 100%; }
      .gallery-toolbar > div:empty { display: none; }
      .gallery-workspace { margin: 0 8px 8px; padding: 6px; gap: 8px; }
    }
    @media (prefers-reduced-transparency: reduce) {
      &, &[data-theme-mode='dark'] { background-image: none; }
      .gallery-workspace::after, .gallery-toolbar::after, .gallery-folder-sidebar::after { display: none; }
      .gallery-toolbar, .gallery-folder-sidebar, aside[role='dialog'] { background: var(--liquid-solid); -webkit-backdrop-filter: none; backdrop-filter: none !important; }
      .glass-card .grid-image-caption, .glass-card .glass-overlay-control { background: #2f2f2f; -webkit-backdrop-filter: none; backdrop-filter: none !important; }
    }
    @media (prefers-reduced-motion: reduce) {
      button, .glass-card, .glass-lens { transition: none; }
      .gallery-toolbar button:active,
      .gallery-pathbar button:active,
      .glass-lens:active,
      .glass-card .glass-overlay-control:active { transform: none; }
    }
    @supports not (backdrop-filter: blur(1px)) {
      .gallery-toolbar, .gallery-folder-sidebar, aside[role='dialog'] { background: var(--liquid-solid); }
      .glass-card .grid-image-caption { background: #2f2f2f; }
    }
  }
`
