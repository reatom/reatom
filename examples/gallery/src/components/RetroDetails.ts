/** A late-90s photo workstation: enamel desktop, silver chrome, inset panes. */
export const retroDetailsCss = `
  &[data-theme-pack='retroOs'] {
    --retro-face: #d4d0c8;
    --retro-paper: #fffef8;
    --retro-ink: #252723;
    --retro-muted: #64665e;
    --retro-light: #fffff5;
    --retro-edge: #777970;
    --retro-desktop: #397c7a;
    --retro-title: linear-gradient(90deg, #183a69, #50798f);
    --retro-raised: inset 1px 1px var(--retro-light), inset -1px -1px var(--retro-edge);
    --retro-inset: inset 1px 1px #55594f, inset -1px -1px var(--retro-light);

    &[data-theme-mode='dark'] {
      --retro-face: #000080;
      --retro-paper: #000080;
      --retro-ink: #00ffff;
      --retro-muted: #a5dddd;
      --retro-light: #00cccc;
      --retro-edge: #00aaaa;
      --retro-desktop: #000080;
      --retro-title: #000080;
      --retro-raised: none;
      --retro-inset: none;
    }

    .gallery-toolbar, .gallery-pathbar, .gallery-folder-sidebar,
    aside[role='dialog'] {
      --text-primary: var(--retro-ink);
      --text-secondary: var(--retro-ink);
      --text-muted: var(--retro-muted);
      --input-bg: var(--retro-face);
      --input-border: var(--retro-edge);
      --accent: #234e7a;
      --accent-contrast: #fff;
      --surface-bg-image: none;
      color: var(--retro-ink);
      background: var(--retro-face);
      font-family: Tahoma, 'MS Sans Serif', sans-serif;
    }
    .gallery-toolbar {
      position: relative;
      min-height: 92px;
      padding: 40px 12px 10px;
      gap: 10px;
      border: 1px solid var(--retro-edge);
      box-shadow: var(--retro-raised);
    }
    .gallery-toolbar::before {
      content: 'Gallery — Photo Explorer';
      position: absolute;
      inset: 3px 3px auto;
      height: 28px;
      padding: 5px 10px;
      background: var(--retro-title);
      color: #fff;
      font: bold 13px Tahoma, sans-serif;
      letter-spacing: .02em;
      pointer-events: none;
    }
    .gallery-brand {
      gap: 7px;
      color: var(--retro-ink);
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -.03em;
    }
    .gallery-brand > span {
      width: 26px; height: 26px;
      border: 1px solid #314a58;
      border-radius: 0;
      background: linear-gradient(135deg, #a8d7cc, #437aa1);
      color: #fff;
      box-shadow: inset 1px 1px #e2f2d9, 1px 1px var(--retro-edge);
    }
    .gallery-toolbar button, .gallery-pathbar button,
    aside[role='dialog'] button {
      color: var(--retro-ink);
      background: var(--retro-face);
      background-image: none;
      border: 1px solid var(--retro-edge);
      border-radius: 0;
      box-shadow: var(--retro-raised);
      text-transform: none;
      font-size: 12px;
      font-weight: 400;
      transition: none;
    }
    .gallery-toolbar button:hover, .gallery-pathbar button:hover,
    aside[role='dialog'] button:hover { outline: 1px dotted var(--retro-muted); outline-offset: -5px; }
    .gallery-toolbar button:active, .gallery-pathbar button:active,
    aside[role='dialog'] button:active,
    .gallery-toolbar button[aria-pressed='true'],
    .gallery-toolbar button[aria-checked='true'] {
      box-shadow: var(--retro-inset);
      background: var(--retro-paper);
      transform: none;
    }
    .gallery-pathbar button[data-active='true'],
    aside[role='dialog'] button[aria-pressed='true'] {
      background: #234e7a;
      color: #fff;
      box-shadow: var(--retro-inset);
    }
    &[data-theme-mode='dark'] .gallery-pathbar { --accent: #bdd9ee; }
    .gallery-toolbar input {
      color: var(--retro-ink);
      background: var(--retro-paper);
      border: 1px solid var(--retro-edge);
      border-radius: 0;
      box-shadow: var(--retro-inset);
    }
    .gallery-toolbar input::placeholder { color: var(--retro-muted); }
    .gallery-pathbar {
      min-height: 42px;
      border: 1px solid var(--retro-edge);
      box-shadow: var(--retro-raised);
    }
    main {
      background-color: var(--retro-desktop);
      background-image:
        radial-gradient(ellipse at 5% 0%, #acd8bd22, transparent 65%),
        repeating-linear-gradient(135deg, #00000005 0 1px, transparent 1px 4px);
      background-size: auto;
      box-shadow: inset 2px 2px 0 #193a3c80;
    }
    .gallery-folder-sidebar {
      padding: 12px 10px;
      border: 1px solid var(--retro-edge);
      box-shadow: var(--retro-raised);
      background-image: none;
    }
    .gallery-folder-sidebar::before {
      content: 'Folders';
      display: block;
      padding: 7px 8px;
      margin-bottom: 8px;
      border-bottom: 1px solid var(--retro-edge);
      box-shadow: 0 1px var(--retro-light);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .02em;
    }
    .gallery-folder-sidebar [role='tree'] {
      min-height: 240px;
      padding: 10px 6px 18px;
      background: var(--retro-paper);
      border: 1px solid var(--retro-edge);
      box-shadow: var(--retro-inset);
    }
    .gallery-folder-sidebar [role='treeitem'] {
      min-height: 32px;
      padding: 6px;
      border: 1px solid transparent;
      border-radius: 0;
      color: var(--retro-ink);
      font-size: 12px;
      gap: 5px;
      transition: none;
    }
    .gallery-folder-sidebar [role='treeitem'] svg {
      color: #9b711c;
      fill: #ebc764;
      filter: drop-shadow(1px 1px 0 #0002);
    }
    .gallery-folder-sidebar [role='treeitem'] button svg { fill: none; color: var(--retro-muted); }
    .gallery-folder-sidebar [role='treeitem']:hover { background: var(--retro-face); }
    .gallery-folder-sidebar [role='treeitem'][aria-selected='true'] {
      background: #234e7a;
      color: #fff;
      border: 1px dotted #e7eff4;
      box-shadow: none;
    }
    .gallery-folder-sidebar [role='treeitem'][aria-selected='true'] > span:last-child { color: #fff; }
    .gallery-folder-sidebar [role='treeitem'] > span:nth-child(3) {
      white-space: normal;
      overflow-wrap: anywhere;
      line-height: 1.4;
    }
    .glass-card {
      background: var(--retro-face);
      border: 1px solid var(--retro-edge);
      border-radius: 0;
      box-shadow: var(--retro-raised), 3px 4px 0 #15343466;
      transition: none;
    }
    .glass-card:not([data-gap='none']) {
      display: flex; flex-direction: column; aspect-ratio: auto;
      padding: 3px;
    }
    .glass-card:not([data-gap='none']) .grid-image-preview {
      position: relative; inset: auto; aspect-ratio: 1; order: 2;
      margin-top: 3px;
      border: 1px solid var(--retro-edge);
      border-radius: 0;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption {
      position: relative; order: 1; margin: 0; padding: 6px 8px;
      background: var(--retro-title);
      text-shadow: none;
      border: 0;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption > div {
      color: #fff; font: 11px Tahoma, sans-serif;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption > div + div { opacity: .75; margin-top: 3px; }
    .glass-card[data-selected='true'] {
      outline: 2px solid #f2d476;
      outline-offset: 2px;
      box-shadow: var(--retro-raised), 3px 4px 0 #15343466;
    }
    .glass-card .glass-overlay-control {
      border: 1px solid var(--retro-edge);
      border-radius: 0;
      background: var(--retro-face);
      color: var(--retro-ink);
      box-shadow: var(--retro-raised);
    }
    .glass-card .glass-overlay-control[aria-checked='true'],
    .glass-card .glass-overlay-control[aria-pressed='true'] { background: #234e7a; color: #fff; }
    aside[role='dialog'] {
      border: 2px solid var(--retro-edge);
      box-shadow: var(--retro-raised), -4px 0 0 #0003;
    }
    aside[role='dialog'] h2 {
      padding: 6px 10px;
      background: var(--retro-title);
      color: #fff;
      font: bold 14px Tahoma, sans-serif;
      letter-spacing: 0;
    }
    .gallery-folder-toggle {
      background: var(--retro-face);
      color: var(--retro-ink);
      border: 1px solid var(--retro-edge);
      border-radius: 0;
      box-shadow: var(--retro-raised);
      backdrop-filter: none;
      transform: translateX(-50%);
      transition: left .3s ease;
    }
    .gallery-folder-toggle:hover {
      background: var(--retro-face);
      color: var(--retro-ink);
      border-color: var(--retro-edge);
      box-shadow: var(--retro-raised);
      transform: translateX(-50%);
      outline: 1px dotted var(--retro-ink);
      outline-offset: -5px;
    }
    .gallery-folder-toggle:active { box-shadow: var(--retro-inset); }
    .gallery-folder-toggle:active svg { transform: translate(1px, 1px); }
    .glass-card:not([data-gap='none']) {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption { grid-area: 1 / 1; }
    .glass-card:not([data-gap='none']) .grid-image-preview { grid-area: 2 / 1; }
    .glass-card .grid-image-overlay { z-index: 2; }
    .glass-card:not([data-gap='none']) .grid-image-overlay {
      position: relative;
      inset: auto;
      grid-area: 2 / 1;
      align-self: stretch;
      min-height: 0;
    }
    .glass-card:focus-within .grid-image-overlay { opacity: 1; }
    &[data-theme-mode='light'] {
      .gallery-toolbar button, .gallery-pathbar button,
      aside[role='dialog'] button, .glass-overlay-control {
        transition: none;
        border-radius: 0;
      }
      .gallery-toolbar button:hover, .gallery-pathbar button:hover,
      aside[role='dialog'] button:hover, .glass-overlay-control:hover {
        background: var(--retro-face);
        color: var(--retro-ink);
        border-color: var(--retro-edge);
        transform: none;
        box-shadow: var(--retro-raised);
      }
      .gallery-toolbar button[aria-pressed='true'],
      .gallery-toolbar button[aria-checked='true'],
      .gallery-pathbar button[data-active='true'],
      aside[role='dialog'] button[aria-pressed='true'],
      .glass-overlay-control[aria-checked='true'],
      .glass-overlay-control[aria-pressed='true'] {
        background: var(--retro-paper);
        color: var(--retro-ink);
        box-shadow: var(--retro-inset);
        outline: 1px dotted var(--retro-muted);
        outline-offset: -4px;
      }
      .gallery-toolbar button:active, .gallery-pathbar button:active,
      aside[role='dialog'] button:active, .glass-overlay-control:active {
        background: var(--retro-face);
        box-shadow: var(--retro-inset);
        transform: none;
      }
      button:active > svg { transform: translate(1px, 1px); }
      button:focus-visible, [role='treeitem']:focus-visible {
        outline: 1px dotted #252723;
        outline-offset: -4px;
      }
      aside[role='dialog'] {
        background: var(--retro-face);
        border: 2px solid var(--retro-edge);
        box-shadow: var(--retro-raised);
        backdrop-filter: none;
      }
      aside[role='dialog'] > div:first-child {
        background: var(--retro-title);
        padding: 3px;
        margin: -15px -15px 20px;
        gap: 8px;
      }
      aside[role='dialog'] h2 { background: transparent; margin: 0; padding: 3px 6px; }
      aside[role='dialog'] button[role='switch'] {
        --toggle-width: 18px;
        --toggle-height: 18px;
        width: 18px; height: 18px;
        border: 1px solid var(--retro-edge);
        background: var(--retro-paper);
        box-shadow: var(--retro-inset);
        outline: none;
      }
      aside[role='dialog'] button[role='switch']::after {
        content: '';
        inset: 3px auto auto 5px;
        width: 5px; height: 9px;
        border: solid #252723;
        border-width: 0 2px 2px 0;
        background: none;
        border-radius: 0;
        box-shadow: none;
        transform: rotate(45deg);
        opacity: 0;
        transition: none;
      }
      aside[role='dialog'] button[role='switch'][aria-checked='true']::after { opacity: 1; }
      aside[role='dialog'] button[role='switch']:active { background: var(--retro-face); }
      aside[role='dialog'] button[role='switch']:focus-visible { outline: 1px dotted #252723; outline-offset: 3px; }
      aside[role='dialog'] input[type='range'] {
        appearance: none;
        height: 5px;
        background: var(--retro-face);
        border: 1px solid var(--retro-edge);
        box-shadow: var(--retro-inset);
        border-radius: 0;
      }
      aside[role='dialog'] input[type='range']::-webkit-slider-thumb {
        appearance: none;
        width: 12px; height: 22px;
        border: 1px solid var(--retro-edge);
        border-radius: 0;
        background: var(--retro-face);
        box-shadow: var(--retro-raised);
      }
      aside[role='dialog'] input[type='range']::-moz-range-thumb {
        width: 12px; height: 22px;
        border: 1px solid var(--retro-edge);
        border-radius: 0;
        background: var(--retro-face);
        box-shadow: var(--retro-raised);
      }
    }
    /* FAR-inspired console palette, with actual gallery controls and labels. */
    &[data-theme-mode='dark'] {
      --far-font: 'Cascadia Mono', 'Lucida Console', Consolas, monospace;
      .gallery-toolbar, .gallery-pathbar, .gallery-folder-sidebar,
      main, aside[role='dialog'], button, input {
        font-family: var(--far-font);
        text-shadow: none;
      }
      .gallery-toolbar {
        min-height: 86px;
        padding-top: 34px;
        border: 1px solid #00aaaa;
        box-shadow: none;
      }
      .gallery-toolbar::before {
        content: 'Gallery ▸ Photo Explorer';
        background: #008080;
        color: #fff;
        height: 24px;
        font: 13px var(--far-font);
      }
      .gallery-brand { color: #ffff55; font: bold 14px var(--far-font); }
      .gallery-brand > span {
        background: #000080;
        border: 1px solid #00ffff;
        color: #00ffff;
        box-shadow: none;
      }
      .gallery-toolbar button, .gallery-pathbar button,
      aside[role='dialog'] button {
        background: #008080;
        color: #fff;
        border: 1px solid transparent;
        box-shadow: none;
        font-family: var(--far-font);
      }
      .gallery-toolbar button:hover, .gallery-pathbar button:hover,
      aside[role='dialog'] button:hover {
        outline: 1px dotted #00ffff;
        outline-offset: -3px;
      }
      .gallery-toolbar button[aria-checked='true'],
      .gallery-toolbar button[aria-pressed='true'],
      .gallery-pathbar button[data-active='true'],
      aside[role='dialog'] button[aria-pressed='true'] {
        background: #00aaaa;
        color: #000;
        border-color: #00ffff;
        box-shadow: none;
      }
      .gallery-toolbar input {
        color: #ffff55;
        background: #000080;
        border: 1px solid #00aaaa;
        box-shadow: none;
      }
      .gallery-pathbar {
        --accent: #00ffff;
        background: #000080;
        border: 3px double #00aaaa;
        box-shadow: none;
      }
      main {
        background: #000080;
        border: 3px double #00aaaa;
        border-top: 0;
        box-shadow: none;
      }
      .gallery-folder-sidebar {
        border: 3px double #00aaaa;
        padding: 10px 6px;
        background: #000080;
        box-shadow: none;
      }
      .gallery-folder-sidebar::before {
        content: 'Name';
        padding: 0 8px 8px;
        border: 0;
        margin: 0;
        color: #ffff55;
        text-align: center;
        box-shadow: none;
        font: 13px var(--far-font);
      }
      .gallery-folder-sidebar [role='tree'] {
        min-height: 0;
        padding: 0;
        border: 0;
        background: #000080;
        box-shadow: none;
      }
      .gallery-folder-sidebar [role='treeitem'] {
        min-height: 28px;
        padding: 4px 3px;
        font: 13px var(--far-font);
        color: #00ffff;
      }
      .gallery-folder-sidebar [role='treeitem'] svg,
      .gallery-folder-sidebar [role='treeitem'] button svg {
        color: #00ffff;
        fill: none;
        filter: none;
      }
      .gallery-folder-sidebar [role='treeitem']:hover { background: #000099; }
      .gallery-folder-sidebar [role='treeitem'][aria-selected='true'] {
        background: #008080;
        border: 1px solid transparent;
        color: #fff;
        box-shadow: none;
      }
      .glass-card, .glass-card[data-selected='true'] {
        border: 1px solid #00aaaa;
        background: #000080;
        box-shadow: none;
      }
      .glass-card:not([data-gap='none']) .grid-image-caption {
        background: #000080;
        padding: 5px 6px;
      }
      .glass-card:not([data-gap='none']) .grid-image-caption > div {
        color: #00ffff;
        font: 12px var(--far-font);
      }
      .glass-card[data-selected='true'] { outline: 1px solid #ffff55; }
      .glass-card[data-selected='true'] .grid-image-caption { background: #008080; }
      .glass-card[data-selected='true'] .grid-image-caption > div { color: #ffff55; }
      .glass-card .glass-overlay-control { background: #008080; color: #fff; box-shadow: none; }
      aside[role='dialog'] {
        background: #008080;
        color: #fff;
        --text-primary: #fff;
        --text-secondary: #fff;
        --text-muted: #c0eeee;
        border: 3px double #00ffff;
        box-shadow: none;
        backdrop-filter: none;
      }
      aside[role='dialog'] h2 {
        background: #008080;
        text-align: center;
        font: 16px var(--far-font);
        border-bottom: 1px solid #00ffff;
      }
      .gallery-folder-toggle:hover, .gallery-folder-toggle:focus-visible {
        background: #008080;
        color: #fff;
        border-color: #00ffff;
        outline: 1px dotted #00ffff;
        outline-offset: -5px;
        box-shadow: none;
      }
      .gallery-folder-toggle:active { background: #00aaaa; color: #000080; }
      aside[role='dialog'] button[role='switch'] {
        width: 36px; height: 24px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 0;
        background: transparent;
        color: #fff;
        box-shadow: none;
        font: 16px/22px var(--far-font);
        transition: none;
      }
      aside[role='dialog'] button[role='switch']::after {
        content: '[ ]';
        position: static;
        display: block;
        width: auto; height: auto;
        border: 0;
        border-radius: 0;
        background: none;
        color: inherit;
        box-shadow: none;
        transform: none;
        transition: none;
        white-space: pre;
      }
      aside[role='dialog'] button[role='switch'][aria-checked='true']::after { content: '[×]'; }
      aside[role='dialog'] button[role='switch']:hover,
      aside[role='dialog'] button[role='switch']:focus-visible {
        color: #ffff55;
        border-color: #00ffff;
        outline: none;
      }
      aside[role='dialog'] button[role='switch']:active { background: #00aaaa; color: #000080; }
      .gallery-lightbox {
        background: #000080;
        .lightbox-toolbar {
          border: 3px double #00ffff;
          background: #000080;
          box-shadow: none;
        }
        .lightbox-toolbar > span { color: #ffff55; font: 14px var(--far-font); }
        .lightbox-toolbar button, > button.lightbox-control-layer,
        .slideshow-controls button {
          background: #008080;
          color: #fff;
          border: 1px solid #00aaaa;
          box-shadow: none;
          font-family: var(--far-font);
        }
        .lightbox-photo-print { box-shadow: 0 0 0 1px #00ffff, 0 0 0 3px #000080, 0 0 0 4px #00aaaa; }
        .lightbox-filmstrip { background: #000080; border-top: 3px double #00aaaa; }
        .lightbox-filmstrip button { border: 1px solid #00aaaa; }
        .lightbox-filmstrip button[data-active='true'] { outline: 1px solid #ffff55; }
        .slideshow-controls, > label.lightbox-control-layer {
          background: #008080;
          color: #fff;
          border: 3px double #00ffff;
          box-shadow: none;
          font-family: var(--far-font);
        }
        .slideshow-controls button[aria-pressed='true'] { background: #00aaaa; color: #000; box-shadow: none; }
      }
    }
    @media (max-width: 600px) {
      .gallery-toolbar { padding: 38px 8px 8px; }
      .gallery-brand { font-size: 13px; }
    }
  }
`
