import { selectedCount, themePack, viewMode, visibleIndexMap } from '../model'

export const BlueprintFooter = () => (
  <>
    {() =>
      themePack() === 'blueprint' ? (
        <footer class="blueprint-footer">
          <span>
            <i /> BLUEPRINT{' '}
            <span class="blueprint-footer-detail">/ PHOTOGRAPHIC INDEX</span>
          </span>
          <span>
            {() =>
              `${String(visibleIndexMap().size).padStart(3, '0')} FRAMES / ${String(selectedCount()).padStart(3, '0')} SELECTED`
            }
          </span>
          <span class="blueprint-footer-detail">
            {() => `${viewMode().toUpperCase()} PROJECTION`} <b>01 / 01</b>
          </span>
        </footer>
      ) : null
    }
  </>
)

export const blueprintDetailsCss = `
  &[data-theme-pack='blueprint'] {
    .gallery-toolbar {
      min-height: 76px;
      padding: 16px 26px;
      border-bottom: 1px solid var(--border-strong);
      box-shadow: none;
      gap: 16px;
      background-image: none;
    }
    .gallery-brand {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -1px;
      gap: 12px;
      margin-right: 12px;
    }
    .gallery-brand > span {
      width: 32px; height: 32px;
      background: transparent;
      color: var(--text-primary);
      border: 1px solid var(--border-strong);
      outline: 1px solid var(--border);
      outline-offset: 3px;
      box-shadow: none;
    }
    .gallery-toolbar button, .gallery-toolbar input {
      min-height: 34px;
      font-family: inherit;
      font-size: 11px;
      letter-spacing: .04em;
    }
    .gallery-toolbar input { width: 210px; }
    .gallery-toolbar [aria-label='View mode'] {
      gap: 0; padding: 3px;
      border: 1px solid var(--border);
    }
    .gallery-workspace { min-height: 0; }
    .gallery-pathbar {
      min-height: 50px; padding: 9px 26px;
      background: var(--toolbar-bg);
      border-bottom: 1px solid var(--border);
    }
    .gallery-pathbar button { font-family: inherit; font-size: 10px; letter-spacing: .035em; }
    .gallery-folder-sidebar {
      padding: 28px 16px;
      background: var(--panel-bg);
      box-shadow: none;
      border-right: 1px solid var(--border-strong);
      display: flex; flex-direction: column;
    }
    .gallery-folder-sidebar::before {
      content: '01 / FOLDER INDEX';
      display: block; margin: 2px 4px 25px; padding-bottom: 17px;
      border-bottom: 1px solid var(--border-strong);
      font-size: 10px; letter-spacing: .13em;
      color: var(--text-secondary);
    }
    .gallery-folder-sidebar [role='tree'] { flex-shrink: 0; }
    .gallery-folder-sidebar [role='treeitem'] {
      min-height: 39px;
      font-size: 11px;
      padding-top: 10px; padding-bottom: 10px;
    }
    .gallery-folder-sidebar [role='treeitem'][aria-selected='true'] {
      background: var(--active-bg);
      color: var(--text-primary);
      box-shadow: inset 3px 0 var(--accent);
    }
    .gallery-folder-sidebar::after {
      content: 'N ↑\\A\\A ──── ◯ ────\\A\\A EVERY FRAME,\\A A POINT OF VIEW.\\A\\A REATOM / BLUEPRINT';
      white-space: pre; text-align: center;
      font-size: 10px; line-height: 1.65; letter-spacing: .14em;
      color: var(--text-muted);
      margin: auto 4px 0; padding-top: 70px; padding-bottom: 16px;
    }
    .gallery-folder-toggle {
      top: 8px;
      background: var(--panel-bg);
      border: 1px solid var(--border-strong);
      box-shadow: none;
    }
    main {
      padding: 26px 36px 36px;
      background-color: var(--bg-primary);
      background-image: var(--app-bg-image);
      background-size: var(--bg-size);
    }
    [data-view-mode='grid'] { counter-reset: blueprint-plate; }
    .glass-card {
      counter-increment: blueprint-plate;
      border: 1px solid var(--card-border);
      background: var(--card-bg);
      box-shadow: none;
    }
    .glass-card:not([data-gap='none']) {
      aspect-ratio: auto;
      padding: 10px;
      display: flex; flex-direction: column;
    }
    .glass-card:not([data-gap='none']) .grid-image-preview {
      position: relative; inset: auto;
      aspect-ratio: 1.15;
      border: 1px solid var(--border);
    }
    .glass-card:not([data-gap='none']) .grid-image-caption {
      position: relative; inset: auto; margin: 0;
      padding: 12px 0 1px 37px;
      min-height: 34px;
      background: none;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption::before {
      content: counter(blueprint-plate, decimal-leading-zero);
      position: absolute; left: 0; top: 12px;
      font-size: 10px; color: var(--text-muted);
      border-right: 1px solid var(--border-strong);
      padding-right: 9px;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption > div {
      color: var(--text-primary);
      font-size: 10px; letter-spacing: .025em;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption > div + div { color: var(--text-muted); }
    .glass-card:hover { background-color: var(--hover-bg); }
    .glass-card:focus-within .grid-image-overlay,
    .glass-card[data-selected='true'] .grid-image-overlay { opacity: 1; }
    .glass-card:not([data-gap='none']) .grid-image-overlay > button { top: 17px; }
    .glass-card:not([data-gap='none']) .grid-image-overlay > button:first-child { left: 17px; }
    .glass-card:not([data-gap='none']) .grid-image-overlay > button:last-child { right: 17px; }
    .blueprint-footer {
      display: flex; justify-content: space-between; align-items: center;
      gap: 20px; padding: 12px 26px;
      flex-shrink: 0; min-height: 41px;
      background: var(--toolbar-bg);
      border-top: 1px solid var(--border-strong);
      font-size: 9px; letter-spacing: .08em; color: var(--text-secondary);
    }
    .blueprint-footer i {
      display: inline-block; width: 6px; height: 6px;
      margin-right: 8px; border: 1px solid currentColor;
      transform: rotate(45deg);
    }
    .blueprint-footer b { border-left: 1px solid var(--border); padding-left: 24px; margin-left: 24px; font-weight: 400; }
    aside[role='dialog'] {
      background: var(--panel-bg);
      background-image: none;
      border-left: 1px solid var(--border-strong);
      box-shadow: -12px 0 40px #10234c20;
    }
    .gallery-lightbox {
      background: var(--overlay-bg);
      color: var(--text-primary);
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      .lightbox-control-layer {
        background: var(--blueprint-viewer-surface);
        border: 1px solid var(--border-strong);
        border-radius: 0; color: var(--text-primary);
        box-shadow: none;
      }
    }
    &[data-theme-mode='light'] .gallery-lightbox {
      --overlay-control: #234f9b0c;
      --overlay-control-hover: #234f9b20;
      --image-overlay: var(--blueprint-viewer-surface);
      .lightbox-toolbar > span,
      .lightbox-toolbar button,
      .slideshow-controls button {
        color: var(--text-primary);
      }
      .slideshow-controls button[aria-pressed='true'] {
        color: var(--accent-contrast);
      }
    }
    @media (max-width: 1200px) {
      .gallery-toolbar { gap: 10px; padding-inline: 18px; }
      .gallery-brand { font-size: 20px; margin-right: 0; }
      .gallery-toolbar input { width: 160px; }
    }
    @media (max-width: 800px) {
      main { padding: 20px; }
      .gallery-pathbar { overflow-x: auto; gap: 8px; padding-inline: 16px; }
      .gallery-pathbar > div { flex-shrink: 0; }
      .gallery-pathbar > div:last-child { flex-wrap: nowrap; }
      .blueprint-footer-detail { display: none; }
      .blueprint-footer { padding-inline: 16px; font-size: 8px; gap: 8px; }
    }
    @media (max-width: 520px) {
      .gallery-toolbar { flex-wrap: wrap; gap: 8px; padding: 12px 16px; overflow: visible; }
      .gallery-toolbar > div:first-child { width: 100%; }
      .gallery-toolbar > div:nth-child(2), .gallery-toolbar > div:nth-child(4),
      .gallery-toolbar > div:nth-child(6), .gallery-toolbar > div:nth-child(8) { display: none; }
      .gallery-toolbar > div:nth-child(7) { order: 2; width: 100%; }
      .gallery-toolbar > div:nth-child(7) > div { flex: 1; }
      .gallery-toolbar input { width: 100%; }
      .gallery-toolbar > div:last-child { margin-left: auto; }
      .gallery-toolbar button { min-height: 32px; }
      .gallery-folder-toggle[aria-expanded='true'] { left: 100% !important; }
      .gallery-folder-toggle { top: 5px; width: 26px; height: 26px; }
      [data-view-mode='grid'] { grid-template-columns: repeat(auto-fill, minmax(min(145px, 100%), 1fr)); }

      .gallery-folder-sidebar { width: 166px; min-width: 166px; margin-left: -166px; padding-inline: 10px; }
      .gallery-folder-sidebar[data-open='true'] { margin-left: 0; }
      main { padding: 16px 12px; }
      .glass-card:not([data-gap='none']) { padding: 5px; }
      .glass-card:not([data-gap='none']) .grid-image-caption { padding-left: 0; }
      .glass-card:not([data-gap='none']) .grid-image-caption::before { display: none; }
    }
    @media (prefers-reduced-transparency: reduce) {
      .gallery-lightbox {
        background: var(--bg-primary);
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
      }
      .gallery-lightbox .lightbox-control-layer { background: var(--bg-secondary); }
    }
    @media (prefers-reduced-motion: reduce) {
      &, *, *::before, *::after { transition: none; }
    }
  }
`
