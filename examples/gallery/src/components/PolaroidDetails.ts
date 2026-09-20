import drawerPullUrl from '../assets/polaroid-drawer-pull.svg'
import folderJacketUrl from '../assets/polaroid-folder.svg'

/** Contact-sheet and photographer's desk art direction for Polaroid. */
export const polaroidDetailsCss = `
  &[data-theme-pack='polaroid'] {
    --polaroid-ink: #31261c;
    --polaroid-coral: #d94f45;
    --polaroid-blue: #4f7fa8;
    --polaroid-paper: #fffaf2;
    --polaroid-tape: rgba(235, 202, 139, 0.9);

    main {
      background-color: #d9ceba;
      background-image:
        radial-gradient(ellipse at 18% 0%, #fff7e5a0, transparent 60%),
        radial-gradient(ellipse at 95% 80%, #8d9b8c40, transparent 65%),
        repeating-linear-gradient(0deg, #63503b08 0 1px, transparent 1px 3px),
        repeating-linear-gradient(90deg, #fffaf218 0 1px, transparent 1px 4px);
      background-size: auto;
    }
    &[data-theme-mode='dark'] main {
      background-color: #292c27;
      background-image:
        radial-gradient(ellipse at 18% 0%, #b69e7130, transparent 60%),
        radial-gradient(ellipse at 95% 80%, #68857520, transparent 65%),
        repeating-linear-gradient(0deg, #fffaf205 0 1px, transparent 1px 3px);
      background-size: auto;
    }

    #gallery-toolbar {
      min-height: 68px;
      padding-top: 12px;
      border-top: 5px solid var(--polaroid-coral);
      border-bottom-color: var(--border-strong);
      box-shadow: 0 8px 24px var(--shadow);
      position: relative;
    }
    #gallery-toolbar::after {
      content: '';
      position: absolute;
      right: 18px;
      bottom: -3px;
      left: 18px;
      height: 3px;
      background: repeating-linear-gradient(90deg, var(--polaroid-coral) 0 24px, var(--polaroid-blue) 24px 42px, transparent 42px 58px);
      opacity: 0.9;
      pointer-events: none;
    }
    #gallery-brand {
      color: var(--text-primary);
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 25px;
      font-weight: 800;
      letter-spacing: -0.07em;
      text-transform: none;
    }
    #gallery-brand > span:first-child {
      width: 40px;
      height: 40px;
      border-radius: 0;
      background: none;
      box-shadow: none;
      transform: rotate(-5deg);
    }
    #gallery-toolbar input {
      border-color: var(--input-border);
      border-radius: 2px;
      box-shadow: 0 2px 0 var(--shadow);
    }
    #gallery-toolbar [data-ui='button'] {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    #gallery-toolbar input:focus { border-color: var(--polaroid-coral); }

    [data-gap] {
      border-color: var(--card-border);
      box-shadow: 0 8px 16px var(--shadow);
      isolation: isolate;
      transition: transform 220ms cubic-bezier(.2, .8, .2, 1), box-shadow 220ms ease;
    }
    [data-gap]:not([data-gap='none']) {
      display: flex;
      flex-direction: column;
      aspect-ratio: auto;
      background-color: var(--polaroid-paper);
      background-image: linear-gradient(100deg, rgba(255,255,255,.48), transparent 48%);
    }
    [data-gap]:not([data-gap='none'])::after {
      content: '';
      position: absolute;
      inset: 9px 9px 24px;
      border: 1px solid rgba(49, 38, 28, 0.1);
      pointer-events: none;
      z-index: 1;
    }
    [data-gap]:not([data-gap='none']):hover,
    [data-gap]:not([data-gap='none']):focus-within { box-shadow: 0 18px 32px var(--shadow-strong); }
    [data-gap][data-gap='none']::before,
    [data-gap][data-gap='none']::after { display: none; }
    [data-gap]:not([data-gap='none']) > div:first-of-type {
      position: relative;
      inset: auto;
      aspect-ratio: 1;
      flex-shrink: 0;
      border-radius: 1px;
      box-shadow: inset 0 0 0 1px rgba(49, 38, 28, 0.08);
    }
    [data-gap]:not([data-gap='none']) [data-caption] {
      position: static;
      min-height: 48px;
      margin: 0;
      z-index: 2;
      padding: 10px 3px 1px;
      background: transparent;
      color: var(--polaroid-ink);
      text-align: center;
      text-shadow: none;
    }
    [data-gap]:not([data-gap='none']) [data-caption] > div:first-child {
      color: var(--polaroid-ink);
      font-family: 'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
    [data-gap]:not([data-gap='none']) [data-caption] > div + div {
      color: rgba(49, 38, 28, 0.58);
      font-size: 10px;
      letter-spacing: 0.04em;
    }
    #gallery-folder-sidebar {
      position: relative;
      padding: 28px 12px 24px;
      background: linear-gradient(90deg, #00000005, transparent 30%, #0000000c), var(--panel-bg);
      border-right: 1px solid var(--border);
      box-shadow: inset -3px 0 8px #31261c0a;
    }
    #gallery-folder-sidebar [role='tree'] {
      position: relative;
      isolation: isolate;
      min-height: 220px;
      padding: 16px 8px 70px;
      background:
        linear-gradient(180deg, #28251fe6, transparent 90px),
        repeating-linear-gradient(90deg, #fff1 0 1px, transparent 1px 5px),
        #716452;
      border: 6px solid #9e7750;
      border-top: 4px solid #bc966b;
      border-radius: 3px 3px 5px 5px;
      box-shadow: inset 0 2px 12px #0007, 0 12px 20px #31261c30, 0 2px 3px #31261c30;
    }
    #gallery-folder-sidebar [role='tree']::before {
      content: '';
      position: absolute;
      inset: 16px 3px 65px;
      border-left: 2px solid #d0c8b8;
      border-right: 2px solid #d0c8b8;
      box-shadow: 1px 0 1px #0006, inset 1px 0 1px #0006;
      pointer-events: none;
      z-index: -1;
    }
    #gallery-folder-sidebar [role='tree']::after {
      content: '';
      position: absolute;
      left: -9px; right: -9px; bottom: -6px;
      height: 68px;
      border: 1px solid #775535;
      border-top: 5px solid #c49a65;
      border-radius: 2px 2px 4px 4px;
      background:
        url("${drawerPullUrl}") center 34px / 90px 30px no-repeat,
        repeating-linear-gradient(2deg, transparent 0 3px, #4b301b12 3px 4px, transparent 4px 7px),
        linear-gradient(100deg, #a77b4c, #bd915e 45%, #a77b4c);
      box-shadow: 0 -4px 8px #0003, inset 0 1px #e6bb83, 0 4px 6px #31261c33;
      pointer-events: none;
      z-index: 1;
    }
    #gallery-folder-sidebar [role='group'] > [role='treeitem'] {
      position: relative;
      isolation: isolate;
      overflow: visible;
      box-sizing: border-box;
      height: 76px;
      min-height: 0;
      margin: 0 -3px -30px;
      padding: 8px 23% 0 5px;
      align-items: flex-start;
      gap: 3px;
      border: 0;
      border-radius: 0;
      background: none;
      box-shadow: none;
      color: #44351f;
      transition: transform 160ms ease;
    }
    #gallery-folder-sidebar [role='group'] > [role='treeitem']::before {
      content: '';
      position: absolute;
      z-index: -1;
      inset: 0;
      background: url("${folderJacketUrl}") center / 100% 100% no-repeat;
      pointer-events: none;
    }
    #gallery-folder-sidebar [role='group'] > [role='treeitem']:hover::before,
    #gallery-folder-sidebar [role='group'] > [role='treeitem'][aria-selected='true']::before {
      filter: brightness(1.045);
    }
    @media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
      #gallery-folder-sidebar [role='group'] > [role='treeitem']:hover {
        transform: translateY(-3px);
      }
    }
    #gallery-folder-sidebar [role='group'] > [role='treeitem']:focus-visible {
      outline: none;
    }
    #gallery-folder-sidebar [role='group'] > [role='treeitem']:focus-visible::after {
      content: '';
      position: absolute;
      inset: 6px 21% auto 4px;
      height: 26px;
      border: 2px solid #325d77;
      border-radius: 5px;
      pointer-events: none;
    }
    #gallery-folder-sidebar [role='group'] > [role='treeitem'] > span:nth-child(2) { display: none; }
    #gallery-folder-sidebar [role='group'] > [role='treeitem'] > span:nth-child(3) {
      flex: 1;
      min-width: 0;
      padding: 0;
      color: #44351f;
      font: 500 14px / 22px 'Helvetica Neue', Arial, sans-serif;
      text-shadow: 0 1px 1px #fff0bc80;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #gallery-folder-sidebar [role='group'] > [role='treeitem'] > span:nth-child(4) {
      color: #614a28;
      font: 500 12px / 22px 'Helvetica Neue', Arial, sans-serif;
      font-variant-numeric: tabular-nums;
      text-shadow: 0 1px #f5dda480;
    }
    #gallery-folder-sidebar [role='group'] > [role='treeitem'] button {
      margin-top: 3px;
    }
    #gallery-folder-sidebar [role='tree'] > [role='treeitem'] {
      position: absolute;
      left: 50%; bottom: 28px;
      transform: translateX(-50%);
      z-index: 2;
      min-height: 0;
      margin: 0;
      padding: 0;
      border: 0;
      background: none;
      box-shadow: none;
      white-space: nowrap;
    }
    #gallery-folder-sidebar [role='tree'] > [role='treeitem']::before,
    #gallery-folder-sidebar [role='tree'] > [role='treeitem'] > span:first-child { display: none; }
    #gallery-folder-sidebar [role='tree'] > [role='treeitem'] > span:last-child {
      padding: 3px 16px;
      white-space: nowrap;
      border: 3px solid #9b8b68;
      border-top-color: #d6c5a0;
      border-left-color: #bcac88;
      border-bottom-color: #74664c;
      border-radius: 2px;
      box-shadow: inset 0 1px 2px #54432540, 0 1px 0 #dfc79f, 0 2px 3px #0005;
      font-size: 0;
      color: #36382d;
      background: #fff8e7;
      max-width: 170px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #gallery-folder-sidebar [role='tree'] > [role='treeitem'] > span:last-child::after {
      content: attr(data-folder-name);
      font: 600 13px / 1.5 'Helvetica Neue', Arial, sans-serif;
    }
    #gallery-folder-sidebar [role='tree'] > [role='treeitem'][aria-selected='true'] > span:last-child {
      color: #963d31;
      border-color: #963d31;
      background: #fff6df;
    }
    #gallery-folder-sidebar [role='treeitem'] button { color: #51412a; }
    #gallery-folder-sidebar [role='tree'] > div[style*='height'] { display: none; }
    aside[role='dialog'] { border-left-color: var(--border); }
    aside[role='dialog'] h2 { font-family: Georgia, 'Times New Roman', serif; letter-spacing: -0.04em; }

    @media (prefers-reduced-motion: reduce) {
      [data-gap] { transition: none; }
      #gallery-folder-sidebar [role='treeitem'] { transition: none; }
      #gallery-folder-sidebar [role='treeitem']:hover { transform: none; }
      #gallery-folder-sidebar [role='tree'] > [role='treeitem']:hover { transform: translateX(-50%); }
      #gallery-brand > span:first-child { transform: none; }
      [data-gap]:hover,
      [data-gap]:focus-within { transform: none !important; }
    }
    @media (max-width: 600px) {
      #gallery-toolbar::after { right: 12px; left: 12px; }
      #gallery-folder-sidebar { padding: 20px 12px; }
      #gallery-folder-sidebar::after { display: none; }
    }
  }
`
