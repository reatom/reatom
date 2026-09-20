/** Bauhaus art direction, scoped so other packs retain their own composition. */
export const bauhausCss = `
  &[data-theme-pack='bauhaus'] {
    --bauhaus-blue: #254bbc;
    --bauhaus-yellow: #e8bb35;
    --bauhaus-red: #c63c2b;
    input:focus-visible {
      outline: 2px solid var(--text-primary);
      outline-offset: 3px;
    }
    #gallery-toolbar {
      min-height: 76px;
      padding: 16px 28px;
      gap: 16px;
      border-bottom: 2px solid var(--text-primary);
      box-shadow: none;
      border-image: linear-gradient(90deg, var(--bauhaus-red) 0 17%, var(--bauhaus-yellow) 17% 34%, var(--bauhaus-blue) 34% 51%, var(--text-primary) 51%) 1;
      border-bottom-width: 3px;
    }
    #gallery-brand {
      font-size: 25px;
      font-weight: 900;
      letter-spacing: -1.2px;
      gap: 11px;
    }
    #gallery-brand > span:first-child {
      width: 25px;
      height: 25px;
      border-radius: 50%;
      position: relative;
      background: conic-gradient(var(--bauhaus-red) 0 75%, var(--text-primary) 75%);
      box-shadow: none;
      transition: transform 350ms cubic-bezier(.2,.8,.2,1);
    }
    #gallery-brand > span:first-child::after {
      content: '';
      position: absolute;
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--bg-primary);
    }
    #gallery-brand:hover > span:first-child { transform: rotate(90deg); }
    #gallery-brand svg { display: none; }
    #gallery-toolbar [data-ui='button'] {
      min-height: 36px;
      font-size: 11px;
      letter-spacing: 0.08em;
      font-weight: 700;
    }
    #gallery-toolbar [data-ui='button']:has(svg) { font-size: 17px; min-width: 36px; }
    #gallery-toolbar input {
      min-height: 36px;
      background: transparent;
      border-color: var(--border);
    }
    main { padding: 24px 28px; background: var(--bg-primary); }
    #gallery-empty {
      max-width: 1400px;
      margin: auto;
      min-height: 540px;
      padding: clamp(20px, 4vw, 64px);
    }
    #gallery-empty::before, #gallery-empty::after { display: none; }
    #gallery-empty [role='region'] {
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
    #gallery-empty [role='region']::before { display: none; }
    #empty-gallery-mark { display: none; }
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
    #gallery-empty button {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 44px;
      min-height: 50px;
      margin-top: 8px;
      padding: 15px 20px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    #gallery-empty button::after { content: '↗'; font-size: 22px; line-height: 16px; }
    [data-gap]:not([data-gap='none']) {
      display: flex;
      flex-direction: column;
      aspect-ratio: auto;
      border-color: var(--border);
    }
    [data-gap]:not([data-gap='none']) > div:first-of-type {
      position: relative;
      inset: auto;
      aspect-ratio: 1;
      flex-shrink: 0;
    }
    [data-gap]:not([data-gap='none']) [data-caption] {
      position: relative;
      padding: 10px 12px 10px 12px;
      padding-right: 36px;
      background: var(--card-bg);
      border-top: 1px solid var(--border);
      transition: background 160ms, color 160ms;
    }
    [data-gap]:not([data-gap='none']) [data-caption] > div {
      color: var(--text-secondary);
      font-size: 11px;
    }
    [data-gap]:not([data-gap='none']) [data-caption] > div:first-child {
      color: var(--text-primary);
      font-weight: 700;
    }
    [data-gap]:not([data-gap='none']) [data-caption]::after {
      content: '';
      position: absolute; right: 12px; top: 12px;
      width: 10px; height: 10px;
      background: var(--print-color);
      clip-path: var(--print-shape);
      transition: transform 200ms;
    }
    [data-gap]:not([data-gap='none']):hover [data-caption],
    [data-gap]:not([data-gap='none']):focus-within [data-caption] {
      background: var(--text-primary);
    }
    [data-gap]:not([data-gap='none']):is(:hover, :focus-within) [data-caption] > div {
      color: var(--bg-primary);
    }
    [data-gap]:not([data-gap='none']):hover [data-caption]::after { transform: rotate(90deg) scale(1.25); }
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
    @media (prefers-reduced-motion: reduce) {
      #gallery-brand > span:first-child, [data-caption],
      [data-caption]::after { transition: none !important; }
      #gallery-brand:hover > span:first-child,
      [data-gap]:hover [data-caption]::after { transform: none !important; }
    }
    @media (max-width: 1000px) {
      #gallery-toolbar { flex-wrap: wrap; gap: 10px; padding: 12px 18px; }
      #gallery-empty { padding: 24px 12px; }
    }
    @media (max-width: 600px) {
      #gallery-toolbar { gap: 8px; }
      #gallery-toolbar > div:has(input) { order: 2; flex: 1 0 100%; }
      #gallery-toolbar > div:has(input) > div { width: 100%; }
      #gallery-toolbar input { width: 100%; }
      #gallery-toolbar > div:empty { display: none; }
      #gallery-toolbar > div:first-child { flex: 1; }
      #gallery-brand { font-size: 22px; }
      main { padding: 16px; }
      #gallery-empty { min-height: 0; height: auto; padding: 12px 0; }
      #gallery-empty [role='region'] { padding: 24px 0; gap: 20px; min-height: 0; }
      #empty-gallery-title { font-size: clamp(46px, 12vw, 68px); max-width: 380px; }
      #empty-gallery-description { max-width: 360px; }
    }
  }
`
