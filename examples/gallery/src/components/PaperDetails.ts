/** Warm, practical catalogue styling with small primary-color accents. */
export const paperDetailsCss = `
  &[data-theme-pack='paper'] {
    --paper-blush: #e8b4bc;
    --header-inline-pad: 24px;
    #gallery-toolbar {
      min-height: 64px;
      padding: 12px var(--header-inline-pad);
      gap: 12px;
      overflow: visible;
      border-bottom: 1px solid var(--border);
      box-shadow: none;
    }
    #gallery-brand {
      gap: 10px;
      color: var(--text-primary);
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -.03em;
    }
    #gallery-brand > span:first-child {
      width: 28px; height: 28px;
      background: var(--accent);
      color: var(--accent-contrast);
      border: 0;
      border-radius: 50%;
      box-shadow: none;
    }
    #gallery-toolbar input {
      box-shadow: none;
      border-radius: var(--radius-sm);
    }
    --folder-header-rail-height: 48px;
    #gallery-pathbar {
      min-height: 48px;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border);
      box-shadow: none;
    }
    main { background: var(--bg-primary); padding: 24px; }
    #gallery-folder-sidebar {
      padding: 24px 16px;
      background: var(--panel-bg);
      border-right: 1px solid var(--border);
      box-shadow: none;
    }
    #gallery-folder-sidebar::before {
      content: 'Your folders';
      display: block;
      width: fit-content;
      margin: 0 10px 12px;
      padding: 0;
      border: 0;
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .06em;
      text-transform: uppercase;
    }
    #gallery-folder-sidebar [role='treeitem'] {
      min-height: 36px;
      padding: 8px 10px;
      border-radius: var(--radius-sm);
      gap: 8px;
      font-weight: 500;
    }
    #gallery-folder-sidebar [role='treeitem'][aria-selected='true'] {
      background: var(--active-bg);
      color: var(--text-primary);
      box-shadow: inset 3px 0 var(--paper-blush);
      font-weight: 600;
    }
    #gallery-folder-divider { margin: 6px 10px 8px; }
    #gallery-folder-sidebar [role='treeitem'] > span:empty { display: none; }
    #gallery-folder-sidebar [role='treeitem'] > span:nth-child(3) {
      white-space: normal;
      overflow-wrap: anywhere;
      line-height: 1.5;
    }
    #gallery-folder-sidebar [role='treeitem'] > span:last-child { font-variant-numeric: tabular-nums; }
    [data-gap] {
      border-radius: 0;
      border-color: transparent;
      background: var(--card-bg);
      box-shadow: none;
    }
    [data-gap]:not([data-gap='none']) {
      display: flex;
      flex-direction: column;
      aspect-ratio: auto;
      padding: 0;
    }
    [data-gap]:not([data-gap='none']) > div:first-of-type {
      position: relative;
      inset: auto;
      aspect-ratio: 1;
      border-radius: 2px;
      outline: 1px solid color-mix(in srgb, var(--text-primary) 10%, transparent);
      outline-offset: -1px;
    }
    [data-gap]:not([data-gap='none']) [data-caption] {
      position: static;
      margin: 0;
      min-height: 0;
      padding: 8px 2px 0;
      color: var(--text-primary);
      background: var(--card-bg);
      text-shadow: none;
    }
    [data-gap]:not([data-gap='none']) [data-caption] > div:first-child {
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: normal;
    }
    [data-gap]:not([data-gap='none']) [data-caption] > div + div {
      margin-top: 2px;
      font-size: 11px;
      color: var(--text-muted);
    }
    [data-view-mode='grid'] { row-gap: calc(var(--gap) + 16px); }
    [data-gap][data-selected='true'] {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      box-shadow: none;
    }
    aside[role='dialog'][data-open='true'] { box-shadow: -12px 0 40px var(--shadow); }
    aside[role='dialog'] h2 { font-weight: 800; letter-spacing: -.04em; }
    #gallery-lightbox {
      background: #161a1d;
      #lightbox-toolbar { background: transparent; }
      #lightbox-toolbar > span { font-family: var(--font-ui); font-weight: 700; }
      #lightbox-filmstrip { background: #161a1d; }
      #slideshow-controls { bottom: 82px; box-shadow: none; }
      #lightbox-scrubber { bottom: 82px; box-shadow: none; }
      @media (max-width: 1000px) { #lightbox-scrubber { bottom: 138px; } }
    }
    @media (max-width: 600px) {
      --header-inline-pad: 12px;
      #gallery-toolbar { padding: 12px var(--header-inline-pad); }
      main { padding: 16px; }
    }
  }
`
