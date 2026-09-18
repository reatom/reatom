/** Warm, practical catalogue styling with small primary-color accents. */
export const paperDetailsCss = `
  &[data-theme-pack='paper'] {
    --paper-blush: #e8b4bc;
    .gallery-toolbar {
      min-height: 76px;
      padding: 16px 24px;
      gap: 12px;
      border-bottom: 1px solid var(--border);
      box-shadow: none;
    }
    .gallery-brand {
      gap: 10px;
      color: var(--text-primary);
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -.055em;
    }
    .gallery-brand > span {
      width: 32px; height: 32px;
      background: var(--accent);
      color: var(--accent-contrast);
      border: 0;
      border-radius: 50%;
      box-shadow: none;
    }
    .gallery-toolbar button, .gallery-toolbar input,
    .gallery-pathbar button, aside[role='dialog'] button { box-shadow: none; }
    .gallery-toolbar button { font-size: 12px; font-weight: 700; }
    .gallery-toolbar input { border-radius: 24px; }
    .gallery-pathbar {
      min-height: 48px;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border);
      box-shadow: none;
    }
    main { background: var(--bg-primary); padding: 24px; }
    .gallery-folder-sidebar {
      padding: 24px 16px;
      background: var(--panel-bg);
      border-right: 1px solid var(--border);
      box-shadow: none;
    }
    .gallery-folder-sidebar::before {
      content: 'Your folders';
      display: block;
      width: fit-content;
      margin: 0 8px 22px;
      padding-bottom: 8px;
      border-bottom: 4px solid var(--paper-blush);
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -.025em;
    }
    .gallery-folder-sidebar [role='treeitem'] {
      min-height: 42px;
      padding: 10px 8px;
      border-radius: 3px;
      gap: 8px;
    }
    .gallery-folder-sidebar [role='treeitem'][aria-selected='true'] {
      background: var(--active-bg);
      color: var(--accent);
      box-shadow: inset 4px 0 var(--paper-blush);
      font-weight: 700;
    }
    .gallery-folder-sidebar [role='treeitem'] > span:empty { display: none; }
    .gallery-folder-sidebar [role='treeitem'] > span:nth-child(3) {
      white-space: normal;
      overflow-wrap: anywhere;
      line-height: 1.5;
    }
    .gallery-folder-sidebar [role='treeitem'] > span:last-child { font-variant-numeric: tabular-nums; }
    .glass-card {
      border-radius: 0;
      border-color: transparent;
      background: var(--card-bg);
      box-shadow: none;
    }
    .glass-card:not([data-gap='none']) {
      display: flex;
      flex-direction: column;
      aspect-ratio: auto;
      padding: 0;
    }
    .glass-card:not([data-gap='none']) .grid-image-preview {
      position: relative;
      inset: auto;
      aspect-ratio: 1;
      border-radius: 2px;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption {
      position: static;
      margin: 0;
      min-height: 62px;
      padding: 14px 4px 18px;
      color: var(--text-primary);
      background: var(--card-bg);
      text-shadow: none;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption > div:first-child {
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: -.015em;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption > div + div {
      margin-top: 5px;
      font-size: 11px;
      color: var(--text-muted);
    }
    .glass-card[data-selected='true'] {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      box-shadow: none;
    }
    .glass-card .glass-overlay-control {
      border-radius: 50%;
      background: var(--panel-bg);
      color: var(--text-primary);
      border: 1px solid var(--border);
      box-shadow: none;
    }
    .glass-card .glass-overlay-control[aria-pressed='true'],
    .glass-card .glass-overlay-control[aria-checked='true'] {
      background: var(--paper-blush);
      color: #17232d;
      border-color: var(--paper-blush);
    }
    aside[role='dialog'] { box-shadow: -12px 0 40px var(--shadow); }
    aside[role='dialog'] h2 { font-weight: 800; letter-spacing: -.04em; }
    .gallery-lightbox {
      background: #161a1d;
      .lightbox-toolbar { background: transparent; }
      .lightbox-toolbar > span { font-family: var(--font-ui); font-weight: 700; }
      .lightbox-toolbar button, > button.lightbox-control-layer {
        background: #f7f7f2;
        color: #17232d;
        border: 0;
        border-radius: 50%;
        box-shadow: none;
      }
      .lightbox-filmstrip { background: #161a1d; }
      .lightbox-filmstrip button[data-active='true'] { border-color: var(--paper-blush); box-shadow: none; }
      .slideshow-controls { bottom: 82px; box-shadow: none; }
      > label.lightbox-control-layer { bottom: 82px; box-shadow: none; }
      .slideshow-controls button[aria-pressed='true'] { background: var(--paper-blush); color: #17232d; }
      @media (max-width: 1000px) { > label.lightbox-control-layer { bottom: 138px; } }
    }
    @media (max-width: 600px) {
      .gallery-toolbar { padding: 12px; }
      main { padding: 16px; }
    }
  }
`
