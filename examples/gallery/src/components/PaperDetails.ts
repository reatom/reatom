/** Warm, practical catalogue styling with small primary-color accents. */
export const paperDetailsCss = `
  &[data-theme-pack='paper'] {
    --paper-blush: #e8b4bc;
    #gallery-toolbar {
      min-height: 76px;
      padding: 16px 24px;
      gap: 12px;
      border-bottom: 1px solid var(--border);
      box-shadow: none;
    }
    #gallery-brand {
      gap: 10px;
      color: var(--text-primary);
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -.055em;
    }
    #gallery-brand > span:first-child {
      width: 32px; height: 32px;
      background: var(--accent);
      color: var(--accent-contrast);
      border: 0;
      border-radius: 50%;
      box-shadow: none;
    }
    #gallery-toolbar input { box-shadow: none; }
    #gallery-toolbar [data-ui='button'] { font-size: 12px; font-weight: 700; }
    #gallery-toolbar input { border-radius: 24px; }
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
      margin: 0 8px 22px;
      padding-bottom: 8px;
      border-bottom: 4px solid var(--paper-blush);
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -.025em;
    }
    #gallery-folder-sidebar [role='treeitem'] {
      min-height: 42px;
      padding: 10px 8px;
      border-radius: 3px;
      gap: 8px;
    }
    #gallery-folder-sidebar [role='treeitem'][aria-selected='true'] {
      background: var(--active-bg);
      color: var(--accent);
      box-shadow: inset 4px 0 var(--paper-blush);
      font-weight: 700;
    }
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
    }
    [data-gap]:not([data-gap='none']) [data-caption] {
      position: static;
      margin: 0;
      min-height: 62px;
      padding: 14px 4px 18px;
      color: var(--text-primary);
      background: var(--card-bg);
      text-shadow: none;
    }
    [data-gap]:not([data-gap='none']) [data-caption] > div:first-child {
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: -.015em;
    }
    [data-gap]:not([data-gap='none']) [data-caption] > div + div {
      margin-top: 5px;
      font-size: 11px;
      color: var(--text-muted);
    }
    [data-gap][data-selected='true'] {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
      box-shadow: none;
    }
    aside[role='dialog'] { box-shadow: -12px 0 40px var(--shadow); }
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
      #gallery-toolbar { padding: 12px; }
      main { padding: 16px; }
    }
  }
`
