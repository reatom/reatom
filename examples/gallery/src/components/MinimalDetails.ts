/** A photographic index: open space, hairline rules, and unframed images. */
export const minimalDetailsCss = `
  &[data-theme-pack='minimal'] {
    .gallery-toolbar {
      min-height: 88px;
      padding: 20px 36px;
      gap: 18px;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border);
      box-shadow: none;
    }
    .gallery-brand {
      font-size: 20px;
      font-weight: 500;
      letter-spacing: -.065em;
      margin-right: 28px;
    }
    .gallery-brand > span { display: none; }
    .gallery-toolbar > div:first-child > span:not(.gallery-brand) { display: none; }
    .gallery-toolbar > div:first-child { gap: 0; }
    .gallery-toolbar > div:empty { background: none; }
    .gallery-toolbar button, .gallery-pathbar button {
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid transparent;
      box-shadow: none;
      font-size: 11px;
      font-weight: 400;
      transition: color .15s, background .15s;
    }
    .gallery-toolbar button:hover, .gallery-pathbar button:hover {
      color: var(--text-primary);
      background: var(--hover-bg);
      transform: none;
    }
    .gallery-toolbar > div:first-child > button {
      padding: 7px 0;
      border-bottom-color: var(--text-muted);
    }
    .gallery-toolbar > div:first-child > button::after {
      content: '↗';
      margin-left: 14px;
    }
    .gallery-toolbar button[aria-pressed='true'] {
      color: var(--text-primary);
      border-bottom-color: var(--text-primary);
      background: transparent;
    }
    .gallery-toolbar input {
      width: 170px;
      background: transparent;
      border: 0;
      border-bottom: 1px solid var(--border);
      padding-bottom: 9px;
      font-size: 11px;
      box-shadow: none;
    }
    .gallery-toolbar svg { width: 15px; height: 15px; }
    .gallery-folder-sidebar {
      padding: 40px 20px;
      background: var(--bg-primary);
      border-right: 1px solid var(--border);
      box-shadow: none;
    }
    .gallery-folder-sidebar::before {
      content: 'LIBRARY';
      display: block;
      margin: 0 10px 28px;
      font-size: 9px;
      letter-spacing: .18em;
      color: var(--text-muted);
    }
    .gallery-folder-sidebar [role='treeitem'] {
      min-height: 38px;
      padding: 9px 8px;
      border: 0;
      font-size: 11px;
      font-weight: 400;
      gap: 8px;
      color: var(--text-secondary);
    }
    .gallery-folder-sidebar [role='treeitem'][aria-selected='true'] {
      background: transparent;
      color: var(--text-primary);
      box-shadow: inset 1px 0 var(--text-primary);
    }
    .gallery-folder-sidebar [role='treeitem']:hover { background: var(--hover-bg); }
    .gallery-folder-sidebar [role='treeitem'] > svg { display: none; }
    .gallery-folder-sidebar [role='treeitem'] > span:last-child {
      font-size: 10px;
      font-variant-numeric: tabular-nums;
    }
    .gallery-folder-toggle {
      top: 32px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      box-shadow: none;
      color: var(--text-muted);
    }
    .gallery-pathbar {
      min-height: 132px;
      padding: 30px 48px 24px;
      align-items: flex-end;
      background: var(--bg-primary);
      border: 0;
    }
    .gallery-pathbar > div:first-child { min-width: 0; }
    .gallery-pathbar nav {
      padding: 0;
      font-size: clamp(24px, 2.5vw, 42px);
      letter-spacing: -.055em;
      line-height: 1.2;
    }
    .gallery-pathbar nav > span { font-weight: 400; }
    .gallery-pathbar nav button { font-size: inherit; letter-spacing: inherit; }
    .gallery-pathbar button[data-active='true'] {
      color: var(--text-primary);
      background: transparent;
      border-bottom-color: var(--text-primary);
    }
    main { padding: 8px 48px 48px; background: var(--bg-primary); }
    [data-view-mode='grid'] {
      column-gap: calc(var(--gap) * 3);
      row-gap: calc(var(--gap) * 3);
      counter-reset: photograph;
    }
    .glass-card {
      border: 0;
      background: transparent;
      box-shadow: none;
      counter-increment: photograph;
    }
    .glass-card:hover { box-shadow: none; }
    .glass-card:not([data-gap='none']) {
      display: flex;
      flex-direction: column;
      aspect-ratio: auto;
      overflow: visible;
    }
    .glass-card:not([data-gap='none']) .grid-image-preview {
      position: relative;
      inset: auto;
      aspect-ratio: 1;
      background: transparent;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption {
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
    .glass-card:not([data-gap='none']) .grid-image-caption::before {
      content: counter(photograph, decimal-leading-zero);
      font-size: 9px;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption > div {
      color: var(--text-secondary);
      font-size: 10px;
      font-weight: 400;
      letter-spacing: .015em;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption > div:last-child:not(:first-child) {
      margin-left: auto;
      flex-shrink: 0;
    }
    .glass-card[data-selected='true'] {
      outline: 1px solid var(--accent);
      outline-offset: 5px;
      box-shadow: none;
    }
    .glass-card:focus-within .grid-image-overlay { opacity: 1; }
    [data-view-mode='list'] [role='button'] {
      border: 0;
      border-bottom: 1px solid var(--border);
      padding: 18px 0;
      background: transparent;
    }
    [data-view-mode='table'] { border-top: 1px solid var(--border); }
    .glass-overlay-control {
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border);
      box-shadow: none;
      border-radius: 0;
    }
    aside[role='dialog'] {
      background: var(--bg-primary);
      border-left: 1px solid var(--border);
      box-shadow: -16px 0 48px #00000008;
      padding: 30px;
    }
    aside[role='dialog']:not([data-open='true']) { box-shadow: none; }
    aside[role='dialog'] h2 { font-weight: 400; letter-spacing: -.04em; font-size: 26px; }
    aside[role='dialog'] h3 { font-size: 9px; letter-spacing: .16em; font-weight: 400; }
    aside[role='dialog'] button { box-shadow: none; }
    .gallery-empty [role='region'] { background: transparent; border: 0; box-shadow: none; }
    .gallery-empty h1 { font-weight: 400; letter-spacing: -.06em; }
    .gallery-empty .empty-gallery-mark { background: transparent; box-shadow: none; color: var(--text-primary); }
    .gallery-lightbox { background: #111; }
    .gallery-lightbox .lightbox-photo-print,
    .gallery-lightbox .lightbox-photo-print > img,
    .gallery-lightbox .lightbox-photo-print > canvas {
      border: 0;
      outline: none;
      box-shadow: none;
      background: transparent;
    }
    .gallery-lightbox .lightbox-photo-print::before,
    .gallery-lightbox .lightbox-photo-print::after {
      content: none;
    }
    .gallery-lightbox .lightbox-control-layer {
      background: #111;
      border: 0;
      border-radius: 0;
      box-shadow: none;
      backdrop-filter: none;
    }
    .gallery-lightbox .lightbox-toolbar { padding: 20px 28px; border-bottom: 1px solid #ffffff20; }
    .gallery-lightbox .lightbox-toolbar button { background: transparent; border-color: transparent; box-shadow: none; }
    .gallery-lightbox .lightbox-filmstrip { border-top: 1px solid #ffffff20; }
    .gallery-lightbox .slideshow-controls {
      gap: 8px;
      padding: 8px 12px;
      background: #111;
      border: 0;
      box-shadow: none;
    }
    .gallery-lightbox .slideshow-controls button {
      min-width: 32px;
      height: 32px;
      padding: 4px 6px;
      background: transparent;
      border: 0;
      border-bottom: 1px solid transparent;
      color: #a0a0a0;
      font-size: 11px;
      font-weight: 400;
      font-variant-numeric: tabular-nums;
      box-shadow: none;
    }
    .gallery-lightbox .slideshow-controls button:hover {
      background: #ffffff0c;
      color: #fff;
    }
    .gallery-lightbox .slideshow-controls button[aria-pressed='true'] {
      background: transparent;
      color: #fff;
      border-bottom-color: #fff;
    }
    .gallery-lightbox .slideshow-controls [role='progressbar'] {
      width: 48px;
      height: 1px;
      margin-left: 8px;
      background: #ffffff30;
    }
    .gallery-lightbox .slideshow-controls [role='progressbar'] > div { background: #fff; }
    .gallery-lightbox { --focus-ring: #ffffff; }
    button:focus-visible, input:focus-visible, [tabindex]:focus-visible {
      outline: 1px solid var(--focus-ring);
      outline-offset: 3px;
      box-shadow: none;
    }
    .gallery-lightbox .lightbox-photo-print:focus,
    .gallery-lightbox .lightbox-photo-print:focus-visible,
    .gallery-lightbox .lightbox-photo-print > :is(img, canvas):focus,
    .gallery-lightbox .lightbox-photo-print > :is(img, canvas):focus-visible {
      outline: none;
      box-shadow: none;
    }
    @media (max-width: 1100px) {
      .gallery-toolbar { padding: 18px 24px; gap: 10px; }
      .gallery-brand { margin-right: 12px; }
      .gallery-pathbar { padding: 28px 28px 20px; flex-wrap: wrap; gap: 16px; }
      main { padding: 8px 28px 32px; }
      [data-view-mode='grid'] { column-gap: calc(var(--gap) * 2); row-gap: calc(var(--gap) * 2); }
    }
    @media (max-width: 640px) {
      .gallery-toolbar { min-height: 72px; padding: 16px; flex-wrap: wrap; gap: 10px; overflow: visible; }
      .gallery-brand { font-size: 19px; margin-right: 16px; }
      .gallery-toolbar input { width: 140px; }
      .gallery-toolbar > div:empty { display: none; }
      .gallery-workspace { position: relative; }
      .gallery-workspace > div:has(> .gallery-folder-sidebar) {
        position: absolute;
        inset: 0 auto 0 0;
        z-index: 20;
      }
      .gallery-folder-sidebar { width: 160px; min-width: 160px; margin-left: -160px; padding: 30px 12px; }
      .gallery-folder-sidebar[data-open='true'] { margin-left: 0; }
      /* The shared toggle uses a desktop pixel position in its inline style. */
      .gallery-folder-toggle[aria-expanded='true'] { left: 160px !important; }
      .gallery-folder-toggle[aria-expanded='false'] { left: 16px !important; }
      .gallery-pathbar { min-height: 112px; padding: 24px 18px 18px; gap: 12px; }
      .gallery-pathbar > div:last-child { flex-wrap: wrap; }
      main { padding: 8px 18px 28px; }
      [data-view-mode='grid'] { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap); }
      .glass-card:not([data-gap='none']) .grid-image-caption { gap: 5px; padding-top: 10px; }
    }
    @media (prefers-reduced-motion: reduce) {
      &, *, *::before, *::after { transition: none; }
    }
  }
`
