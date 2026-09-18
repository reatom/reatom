/** Bauhaus art direction, scoped so other packs retain their own composition. */
export const bauhausCss = `
  &[data-theme-pack='bauhaus'] {
    --bauhaus-blue: #254bbc;
    --bauhaus-yellow: #e8bb35;
    --bauhaus-red: #c63c2b;
    button, button:hover { box-shadow: none; }
    button:focus-visible, input:focus-visible {
      outline: 2px solid var(--text-primary);
      outline-offset: 3px;
    }
    .gallery-toolbar {
      min-height: 76px;
      padding: 16px 28px;
      gap: 16px;
      border-bottom: 2px solid var(--text-primary);
      box-shadow: none;
    }
    .gallery-brand {
      font-size: 25px;
      font-weight: 900;
      letter-spacing: -1.2px;
      gap: 11px;
    }
    .gallery-brand > span {
      width: 25px;
      height: 25px;
      border-radius: 50%;
      background: var(--bauhaus-red);
      box-shadow: none;
    }
    .gallery-brand svg { display: none; }
    .gallery-toolbar button {
      min-height: 36px;
      font-size: 11px;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    .gallery-toolbar button:has(svg) { font-size: 17px; min-width: 36px; }
    .gallery-toolbar input {
      min-height: 36px;
      background: transparent;
      border-color: var(--border);
    }
    .gallery-toolbar [aria-pressed='true'] {
      background: var(--text-primary);
      border-color: var(--text-primary);
      color: var(--bg-primary);
    }
    main { padding: 24px 28px; background: var(--bg-primary); }
    .gallery-empty {
      max-width: 1400px;
      margin: auto;
      min-height: 540px;
      padding: clamp(20px, 4vw, 64px);
    }
    .gallery-empty::before, .gallery-empty::after { display: none; }
    .gallery-empty [role='region'] {
      width: 100%;
      min-height: 460px;
      padding: 32px 52% 40px 0;
      border: none;
      border-top: 2px solid var(--text-primary);
      border-bottom: 1px solid var(--text-primary);
      background: none;
      box-shadow: none;
      overflow: visible;
      justify-items: start;
      align-content: center;
      gap: 24px;
    }
    .gallery-empty [role='region']::before { display: none; }
    .gallery-empty .empty-gallery-mark { display: none; }
    .gallery-empty .bauhaus-eyebrow {
      display: block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--text-primary);
    }
    #empty-gallery-title {
      font-size: clamp(44px, 5.2vw, 76px);
      line-height: 0.98;
      font-weight: 900;
      letter-spacing: -0.065em;
      text-align: left;
      text-wrap: initial;
      max-width: 540px;
    }
    #empty-gallery-description {
      max-width: 340px;
      font-size: 15px;
      line-height: 1.65;
      text-align: left;
    }
    #empty-gallery-browser-support { text-align: left; }
    .gallery-empty button {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 44px;
      min-height: 50px;
      margin-top: 8px;
      padding: 15px 20px;
      background: var(--accent);
      border-color: var(--accent);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      box-shadow: none;
    }
    .gallery-empty button::after { content: '↗'; font-size: 22px; line-height: 16px; }
    .gallery-empty button:hover { background: var(--accent-hover); transform: none; }
    .gallery-empty .bauhaus-art {
      display: block;
      position: absolute;
      inset: 24px 0 24px 55%;
      overflow: hidden;
      border-left: 1px solid var(--text-primary);
      background: var(--bg-secondary);
    }
    .bauhaus-art > span { position: absolute; display: block; }
    .bauhaus-circle {
      width: 68%; aspect-ratio: 1;
      top: 6%; left: 9%;
      border-radius: 50%; background: var(--bauhaus-red);
    }
    .bauhaus-triangle {
      width: 78%; height: 74%; top: 9%; right: -12%;
      background: var(--bauhaus-yellow);
      clip-path: polygon(50% 0, 100% 100%, 0 100%);
    }
    .bauhaus-square {
      width: 53%; height: 44%; bottom: 9%; left: 0;
      background: var(--bauhaus-blue);
    }
    .bauhaus-lines {
      width: 36%; height: 23%; bottom: 12%; right: 0;
      background: repeating-linear-gradient(0deg, var(--text-primary) 0 2px, transparent 2px 10px);
    }
    .bauhaus-art .bauhaus-art-caption {
      bottom: 0; right: 0;
      padding: 6px 0 0 12px;
      color: var(--text-primary); background: var(--bg-primary);
      font-size: 9px; font-weight: 700; letter-spacing: 0.16em;
    }
    .glass-card:not([data-gap='none']) {
      display: flex;
      flex-direction: column;
      aspect-ratio: auto;
      border-color: var(--border);
    }
    .glass-card:not([data-gap='none']) .grid-image-preview {
      position: relative;
      inset: auto;
      aspect-ratio: 1;
      flex-shrink: 0;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption {
      position: static;
      padding: 10px 12px;
      background: var(--card-bg);
      border-top: 1px solid var(--border);
    }
    .glass-card:not([data-gap='none']) .grid-image-caption > div {
      color: var(--text-secondary);
      font-size: 11px;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption > div:first-child {
      color: var(--text-primary);
      font-weight: 700;
    }
    .glass-card:focus-within .grid-image-overlay { opacity: 1; }
    aside[role='dialog'][data-open='true'] {
      border-left: 2px solid var(--text-primary);
      box-shadow: -16px 0 48px rgba(0, 0, 0, 0.12);
    }
    aside[role='dialog'] h2 { font-size: 30px; font-weight: 900; letter-spacing: -0.05em; }
    aside[role='dialog'] h3 {
      border-top: 1px solid var(--border);
      padding-top: 16px;
      letter-spacing: 0.12em;
    }
    [role='treeitem'][aria-selected='true'] { box-shadow: inset 3px 0 var(--accent); }

    /* Small printed details carry the geometry into the working gallery. */
    .gallery-toolbar {
      border-image: linear-gradient(90deg, var(--bauhaus-red) 0 17%, var(--bauhaus-yellow) 17% 34%, var(--bauhaus-blue) 34% 51%, var(--text-primary) 51%) 1;
      border-bottom-width: 3px;
    }
    .gallery-brand > span {
      position: relative;
      background: conic-gradient(var(--bauhaus-red) 0 75%, var(--text-primary) 75%);
      transition: transform 350ms cubic-bezier(.2,.8,.2,1);
    }
    .gallery-brand > span::after {
      content: '';
      position: absolute;
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--bg-primary);
    }
    .gallery-brand:hover > span { transform: rotate(90deg); }
    .gallery-toolbar button:not([aria-pressed='true']):not(:disabled):hover {
      background: var(--bauhaus-yellow);
      color: #20211f;
      border-color: #20211f;
    }
    .gallery-toolbar button:active { transform: translateY(2px); }
    .gallery-folder-sidebar { display: flex; flex-direction: column; }
    .bauhaus-sidebar-print {
      display: flex;
      flex-direction: column;
      gap: 18px;
      flex-shrink: 0;
      margin: auto 12px 18px;
      padding-top: 56px;
      user-select: none;
      color: var(--text-primary);
    }
    .bauhaus-print-shapes { display: flex; align-items: end; height: 54px; }
    .bauhaus-print-shapes > span { display: block; width: 54px; height: 54px; }
    .bauhaus-print-shapes > span:nth-child(1) {
      background: var(--bauhaus-red); border-radius: 50%;
    }
    .bauhaus-print-shapes > span:nth-child(2) {
      background: var(--bauhaus-yellow); clip-path: polygon(50% 0, 100% 100%, 0 100%);
      margin-left: -9px;
    }
    .bauhaus-print-shapes > span:nth-child(3) {
      background: var(--bauhaus-blue); width: 38px; height: 38px; margin-left: -5px;
    }
    .bauhaus-print-title {
      font-size: 44px; line-height: .88; letter-spacing: -.065em; font-weight: 900;
    }
    .bauhaus-print-note {
      font-size: 9px; letter-spacing: .13em; font-weight: 700;
      border-top: 1px solid var(--text-primary); padding-top: 12px;
    }
    .grid-image-entry { --print-color: var(--bauhaus-red); --print-shape: circle(50%); }
    .grid-image-entry:nth-child(3n + 2) {
      --print-color: var(--bauhaus-blue); --print-shape: inset(0);
    }
    .grid-image-entry:nth-child(3n) {
      --print-color: var(--bauhaus-yellow); --print-shape: polygon(50% 0, 100% 100%, 0 100%);
    }
    .glass-card:not([data-gap='none']) .grid-image-caption {
      position: relative;
      padding-right: 36px;
      transition: background 160ms, color 160ms;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption::after {
      content: '';
      position: absolute; right: 12px; top: 12px;
      width: 10px; height: 10px;
      background: var(--print-color);
      clip-path: var(--print-shape);
      transition: transform 200ms;
    }
    .glass-card:not([data-gap='none']):hover .grid-image-caption,
    .glass-card:not([data-gap='none']):focus-within .grid-image-caption {
      background: var(--text-primary);
    }
    .glass-card:not([data-gap='none']):is(:hover, :focus-within) .grid-image-caption > div {
      color: var(--bg-primary);
    }
    .glass-card:not([data-gap='none']):hover .grid-image-caption::after { transform: rotate(90deg) scale(1.25); }
    .glass-card[data-selected='true'] .grid-image-overlay { opacity: 1; }
    .glass-card .glass-overlay-control {
      width: 28px; height: 28px;
      background: var(--bg-primary);
      color: var(--text-primary);
      border-color: var(--text-primary);
    }
    .glass-card .glass-overlay-control[aria-pressed='true'] {
      background: var(--bauhaus-yellow); color: #20211f; border-radius: 50%;
    }
    .glass-card .glass-overlay-control[aria-checked='true'] {
      background: var(--bauhaus-blue); color: white; border-color: var(--bauhaus-blue);
    }
    .bauhaus-art > span:not(.bauhaus-art-caption) { transition: transform 450ms cubic-bezier(.2,.8,.2,1); }
    .bauhaus-art:hover .bauhaus-circle { transform: translate(8px, -6px); }
    .bauhaus-art:hover .bauhaus-triangle { transform: translate(-8px, 0); }
    .bauhaus-art:hover .bauhaus-square { transform: translateY(8px); }
    .bauhaus-art:hover .bauhaus-lines { transform: translateX(-12px); }
    @media (prefers-reduced-motion: reduce) {
      .gallery-brand > span, .bauhaus-art > span, .grid-image-caption,
      .grid-image-caption::after { transition: none !important; }
      .gallery-brand:hover > span, .bauhaus-art:hover > span,
      .glass-card:hover .grid-image-caption::after { transform: none !important; }
    }
    @media (max-width: 1000px) {
      .gallery-toolbar { flex-wrap: wrap; gap: 10px; padding: 12px 18px; }
      .gallery-empty { padding: 24px 12px; }
    }
    @media (max-width: 600px) {
      .gallery-toolbar { gap: 8px; }
      .gallery-toolbar > div:has(input) { order: 2; flex: 1 0 100%; }
      .gallery-toolbar > div:has(input) > div { width: 100%; }
      .gallery-toolbar input { width: 100%; }
      .gallery-toolbar > div:empty { display: none; }
      .gallery-toolbar > div:first-child { flex: 1; }
      .gallery-brand { font-size: 22px; }
      main { padding: 16px; }
      .gallery-empty { min-height: 0; height: auto; padding: 12px 0; }
      .gallery-empty [role='region'] { padding: 24px 0; gap: 20px; min-height: 0; }
      .gallery-empty .bauhaus-art {
        position: relative; inset: auto; width: 100%; height: 220px;
        border-left: 0; grid-row: 5; margin-top: 12px;
      }
      .bauhaus-circle { width: 48%; left: 13%; top: 8%; }
      .bauhaus-triangle { width: 58%; right: 0; }
      .bauhaus-square { width: 36%; left: 5%; }
      #empty-gallery-title { font-size: clamp(46px, 12vw, 68px); max-width: 380px; }
      #empty-gallery-description { max-width: 360px; }
    }
  }
`
