/** A photographic index: open space, hairline rules, and unframed images. */
export const minimalDetailsCss = `
  &[data-theme-pack='minimal'] {
    --folder-header-rail-height: 64px;
    --header-inline-pad: 24px;
    --minimal-content-start: max(
      var(--header-inline-pad),
      calc(var(--folder-toggle-size) + var(--folder-toggle-inset) + 12px)
    );
    --folder-toggle-bg: transparent;
    --sidebar-width: 220px;
    #gallery-toolbar {
      min-height: 64px;
      padding: 12px var(--header-inline-pad);
      gap: 16px;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border);
      box-shadow: none;
    }
    #gallery-brand {
      font-size: 20px;
      font-weight: 500;
      letter-spacing: -.065em;
      margin-right: 16px;
    }
    #gallery-brand > span:first-child { display: none; }
    #gallery-toolbar > div:first-child { gap: 8px; }
    #gallery-toolbar input {
      width: 200px;
      background: transparent;
      border: 0;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      box-shadow: none;
    }
    #gallery-folder-sidebar {
      padding: 24px 14px;
      background: var(--bg-primary);
      border-right: 1px solid var(--border);
      box-shadow: none;
    }
    #gallery-folder-sidebar::before {
      content: 'Library';
      display: block;
      margin: 0 10px 16px;
      font-size: 11px;
      letter-spacing: .14em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    #gallery-folder-sidebar [role='treeitem'] {
      min-height: 36px;
      padding: 8px 10px;
      border: 0;
      font-size: 13px;
      font-weight: 400;
      gap: 8px;
      color: var(--text-secondary);
    }
    #gallery-folder-sidebar [role='treeitem'][aria-selected='true'] {
      background: transparent;
      color: var(--text-primary);
      font-weight: 500;
      box-shadow: inset 2px 0 var(--text-primary);
    }
    #gallery-folder-sidebar [role='treeitem']:hover { background: var(--hover-bg); }
    #gallery-folder-sidebar [role='treeitem'] > span:empty,
    #gallery-folder-sidebar [role='treeitem'] > span:has(> svg) { display: none; }
    #gallery-folder-sidebar [role='treeitem'] > span:last-child {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      color: var(--text-muted);
    }
    #gallery-folder-divider { margin: 6px 10px 8px; }
    #gallery-pathbar {
      min-height: 64px;
      padding: 8px var(--header-inline-pad);
      align-items: center;
      background: var(--bg-primary);
      border: 0;
    }
    #gallery-pathbar > div:first-child { min-width: 0; align-items: baseline; gap: 12px; }
    #gallery-pathbar nav {
      padding: 0;
      font-size: clamp(22px, 2vw, 30px);
      letter-spacing: -.04em;
      line-height: 1.2;
    }
    #gallery-pathbar nav > span { font-weight: 400; }
    #gallery-pathbar nav button { font-size: inherit; letter-spacing: inherit; }
    #gallery-folder-count {
      font-size: 13px;
      color: var(--text-muted);
      letter-spacing: 0;
    }
    main {
      padding: 8px var(--header-inline-pad) 48px var(--minimal-content-start);
      background: var(--bg-primary);
    }
    [data-view-mode='grid'] {
      column-gap: calc(var(--gap) * 3);
      row-gap: calc(var(--gap) * 2.5);
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
    [data-gap] > div:first-of-type {
      background: color-mix(in srgb, var(--text-primary) 5%, transparent);
    }
    [data-gap]:not([data-gap='none']) > div:first-of-type {
      position: relative;
      inset: auto;
      aspect-ratio: 1;
    }
    [data-gap]:not([data-gap='none']) [data-caption] {
      position: static;
      margin: 0;
      padding: 10px 0 0;
      min-height: 0;
      background: transparent;
      display: flex;
      align-items: baseline;
      gap: 10px;
    }
    [data-gap]:not([data-gap='none']) [data-caption]::before {
      content: counter(photograph, decimal-leading-zero);
      font-size: 11px;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
      letter-spacing: .02em;
    }
    [data-gap]:not([data-gap='none']) [data-caption] > div {
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 400;
      letter-spacing: normal;
    }
    [data-gap]:not([data-gap='none']) [data-caption] > div:last-child:not(:first-child) {
      margin-left: auto;
      flex-shrink: 0;
      font-size: 11px;
      color: var(--text-muted);
    }
    [data-gap][data-selected='true'] {
      outline: 2px solid var(--accent);
      outline-offset: 4px;
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
    aside[role='dialog'] h3 { font-size: 11px; letter-spacing: .16em; font-weight: 400; }
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
      #gallery-toolbar { gap: 12px; }
      #gallery-brand { margin-right: 12px; }
      #gallery-pathbar { flex-wrap: wrap; gap: 16px; }
      main { padding-bottom: 32px; }
      [data-view-mode='grid'] { column-gap: calc(var(--gap) * 2); row-gap: calc(var(--gap) * 2); }
    }
    @media (max-width: 640px) {
      --header-inline-pad: 16px;
      #gallery-toolbar { min-height: 56px; padding: 10px var(--header-inline-pad); flex-wrap: wrap; gap: 10px; overflow: visible; }
      #gallery-brand { font-size: 19px; margin-right: 16px; }
      #gallery-toolbar input { width: 160px; }
      #gallery-toolbar > div:empty { display: none; }
      #gallery-workspace { position: relative; }
      --sidebar-width: 160px;
      #gallery-workspace > div:has(> #gallery-folder-sidebar) {
        position: absolute;
        inset: 0 auto 0 0;
        z-index: 20;
      }
      #gallery-folder-sidebar { padding: 30px 12px; }
      --folder-header-rail-height: 56px;
      #gallery-pathbar { min-height: 56px; padding: 8px var(--header-inline-pad); gap: 12px; }
      #gallery-pathbar > div:last-child { flex-wrap: wrap; }
      main { padding: 8px var(--header-inline-pad) 28px; }
      [data-view-mode='grid'] { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: calc(var(--gap) * 2) var(--gap); }
      [data-gap]:not([data-gap='none']) [data-caption] { gap: 6px; padding-top: 8px; }
    }
    @media (prefers-reduced-motion: reduce) {
      &, *, *::before, *::after { transition: none; }
    }
  }
`
