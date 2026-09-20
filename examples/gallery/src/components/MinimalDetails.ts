/** A photographic index: open space, hairline rules, and unframed images. */
export const minimalDetailsCss = `
  &[data-theme-pack='minimal'] {
    --folder-header-rail-height: 98px;
    #gallery-toolbar {
      min-height: 88px;
      padding: 20px 36px;
      gap: 18px;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border);
      box-shadow: none;
    }
    #gallery-brand {
      font-size: 20px;
      font-weight: 500;
      letter-spacing: -.065em;
      margin-right: 28px;
    }
    #gallery-brand > span:first-child { display: none; }
    #gallery-toolbar > div:first-child > span:not(#gallery-brand) { display: none; }
    #gallery-toolbar > div:first-child { gap: 0; }
    #gallery-toolbar > div:empty { background: none; }
    #gallery-toolbar [data-ui='button'], #gallery-pathbar [data-ui='button'] {
      font-size: 11px;
      font-weight: 400;
    }
    #gallery-toolbar > div:first-child > [data-ui='button']::after {
      content: '↗';
      margin-left: 14px;
    }
    #gallery-toolbar input {
      width: 170px;
      background: transparent;
      border: 0;
      border-bottom: 1px solid var(--border);
      padding-bottom: 9px;
      font-size: 11px;
      box-shadow: none;
    }
    #gallery-toolbar svg { width: 15px; height: 15px; }
    #gallery-folder-sidebar {
      padding: 40px 20px;
      background: var(--bg-primary);
      border-right: 1px solid var(--border);
      box-shadow: none;
    }
    #gallery-folder-sidebar::before {
      content: 'LIBRARY';
      display: block;
      margin: 0 10px 28px;
      font-size: 9px;
      letter-spacing: .18em;
      color: var(--text-muted);
    }
    #gallery-folder-sidebar [role='treeitem'] {
      min-height: 38px;
      padding: 9px 8px;
      border: 0;
      font-size: 11px;
      font-weight: 400;
      gap: 8px;
      color: var(--text-secondary);
    }
    #gallery-folder-sidebar [role='treeitem'][aria-selected='true'] {
      background: transparent;
      color: var(--text-primary);
      box-shadow: inset 1px 0 var(--text-primary);
    }
    #gallery-folder-sidebar [role='treeitem']:hover { background: var(--hover-bg); }
    #gallery-folder-sidebar [role='treeitem'] > svg { display: none; }
    #gallery-folder-sidebar [role='treeitem'] > span:last-child {
      font-size: 10px;
      font-variant-numeric: tabular-nums;
    }
    #gallery-pathbar {
      min-height: 132px;
      padding: 30px 48px 24px;
      align-items: flex-end;
      background: var(--bg-primary);
      border: 0;
    }
    #gallery-pathbar > div:first-child { min-width: 0; }
    #gallery-pathbar nav {
      padding: 0;
      font-size: clamp(24px, 2.5vw, 42px);
      letter-spacing: -.055em;
      line-height: 1.2;
    }
    #gallery-pathbar nav > span { font-weight: 400; }
    #gallery-pathbar nav button { font-size: inherit; letter-spacing: inherit; }
    main { padding: 8px 48px 48px; background: var(--bg-primary); }
    [data-view-mode='grid'] {
      column-gap: calc(var(--gap) * 3);
      row-gap: calc(var(--gap) * 3);
      counter-reset: photograph;
    }
    [data-gap] {
      border: 0;
      background: transparent;
      box-shadow: none;
      counter-increment: photograph;
    }
    [data-gap]:hover { box-shadow: none; }
    [data-gap]:not([data-gap='none']) {
      display: flex;
      flex-direction: column;
      aspect-ratio: auto;
      overflow: visible;
    }
    [data-gap]:not([data-gap='none']) > div:first-of-type {
      position: relative;
      inset: auto;
      aspect-ratio: 1;
      background: transparent;
    }
    [data-gap]:not([data-gap='none']) [data-caption] {
      position: static;
      margin: 0;
      padding: 14px 0 0;
      min-height: 36px;
      background: transparent;
      display: flex;
      align-items: baseline;
      gap: 10px;
      border-top: 1px solid var(--border);
    }
    [data-gap]:not([data-gap='none']) [data-caption]::before {
      content: counter(photograph, decimal-leading-zero);
      font-size: 9px;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }
    [data-gap]:not([data-gap='none']) [data-caption] > div {
      color: var(--text-secondary);
      font-size: 10px;
      font-weight: 400;
      letter-spacing: .015em;
    }
    [data-gap]:not([data-gap='none']) [data-caption] > div:last-child:not(:first-child) {
      margin-left: auto;
      flex-shrink: 0;
    }
    [data-gap][data-selected='true'] {
      outline: 1px solid var(--accent);
      outline-offset: 5px;
      box-shadow: none;
    }
    [data-view-mode='list'] [role='button'] {
      border: 0;
      border-bottom: 1px solid var(--border);
      padding: 18px 0;
      background: transparent;
    }
    [data-view-mode='table'] { border-top: 1px solid var(--border); }
    aside[role='dialog'] {
      background: var(--bg-primary);
      border-left: 1px solid var(--border);
      box-shadow: -16px 0 48px #00000008;
      padding: 30px;
    }
    aside[role='dialog']:not([data-open='true']) { box-shadow: none; }
    aside[role='dialog'] h2 { font-weight: 400; letter-spacing: -.04em; font-size: 26px; }
    aside[role='dialog'] h3 { font-size: 9px; letter-spacing: .16em; font-weight: 400; }
    aside[role='dialog'] [data-ui='button'] { min-height: 28px; }
    #gallery-empty [role='region'] { background: transparent; border: 0; box-shadow: none; }
    #gallery-empty h1 { font-weight: 400; letter-spacing: -.06em; }
    #gallery-empty #empty-gallery-mark { background: transparent; box-shadow: none; color: var(--text-primary); }
    #gallery-lightbox { background: #111; }
    #gallery-lightbox #lightbox-print,
    #gallery-lightbox #lightbox-print > img,
    #gallery-lightbox #lightbox-print > canvas {
      border: 0;
      outline: none;
      box-shadow: none;
      background: transparent;
    }
    #gallery-lightbox #lightbox-print::before,
    #gallery-lightbox #lightbox-print::after {
      content: none;
    }
    #gallery-lightbox :is(#lightbox-toolbar, #lightbox-filmstrip, #slideshow-controls, #lightbox-scrubber) {
      background: #111;
      border: 0;
      border-radius: 0;
      box-shadow: none;
      backdrop-filter: none;
    }
    #gallery-lightbox #lightbox-toolbar { padding: 20px 28px; border-bottom: 1px solid #ffffff20; }
    #gallery-lightbox #lightbox-filmstrip { border-top: 1px solid #ffffff20; }
    #gallery-lightbox #slideshow-controls {
      gap: 8px;
      padding: 8px 12px;
      background: #111;
      border: 0;
      box-shadow: none;
    }
    #gallery-lightbox #slideshow-controls [data-ui='button'] {
      min-width: 32px;
      height: 32px;
      padding: 4px 6px;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
    #gallery-lightbox #slideshow-controls [role='progressbar'] {
      width: 48px;
      height: 1px;
      margin-left: 8px;
      background: #ffffff30;
    }
    #gallery-lightbox #slideshow-controls [role='progressbar'] > div { background: #fff; }
    #gallery-lightbox { --focus-ring: #ffffff; }
    input:focus-visible, [tabindex]:focus-visible {
      outline: 1px solid var(--focus-ring);
      outline-offset: 3px;
      box-shadow: none;
    }
    #gallery-lightbox #lightbox-print:focus,
    #gallery-lightbox #lightbox-print:focus-visible,
    #gallery-lightbox #lightbox-print > :is(img, canvas):focus,
    #gallery-lightbox #lightbox-print > :is(img, canvas):focus-visible {
      outline: none;
      box-shadow: none;
    }
    @media (max-width: 1100px) {
      #gallery-toolbar { padding: 18px 24px; gap: 10px; }
      #gallery-brand { margin-right: 12px; }
      #gallery-pathbar { padding: 28px 28px 20px; flex-wrap: wrap; gap: 16px; }
      main { padding: 8px 28px 32px; }
      [data-view-mode='grid'] { column-gap: calc(var(--gap) * 2); row-gap: calc(var(--gap) * 2); }
    }
    @media (max-width: 640px) {
      #gallery-toolbar { min-height: 72px; padding: 16px; flex-wrap: wrap; gap: 10px; overflow: visible; }
      #gallery-brand { font-size: 19px; margin-right: 16px; }
      #gallery-toolbar input { width: 140px; }
      #gallery-toolbar > div:empty { display: none; }
      #gallery-workspace { position: relative; }
      --sidebar-width: 160px;
      #gallery-workspace > div:has(> #gallery-folder-sidebar) {
        position: absolute;
        inset: 0 auto 0 0;
        z-index: 20;
      }
      #gallery-folder-sidebar { padding: 30px 12px; }
      #gallery-pathbar { min-height: 112px; padding: 24px 18px 18px; gap: 12px; }
      #gallery-pathbar > div:last-child { flex-wrap: wrap; }
      main { padding: 8px 18px 28px; }
      [data-view-mode='grid'] { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap); }
      [data-gap]:not([data-gap='none']) [data-caption] { gap: 5px; padding-top: 10px; }
    }
    @media (prefers-reduced-motion: reduce) {
      &, *, *::before, *::after { transition: none; }
    }
  }
`
