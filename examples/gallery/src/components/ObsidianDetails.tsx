import { selectedCount, themePack } from '../model'

export const ObsidianFooter = () => (
  <>
    {() =>
      themePack() === 'obsidian' ? (
        <footer class="obsidian-footer">
          <span>
            <b aria-hidden="true">◇</b> Obsidian <i>/</i> Local collection
          </span>
          <span>{() => selectedCount()} selected</span>
          <span>
            Volcanic glass <b aria-hidden="true">◇</b>
          </span>
        </footer>
      ) : null
    }
  </>
)

/** Mineral surfaces and Gothic details, isolated from all other theme packs. */
export const obsidianCss = `
  &[data-theme-pack='obsidian'] {
    --obsidian-serif: 'Baskerville', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
    .gallery-workspace { min-height: 0; }
    button, input, select { border-radius: 2px; clip-path: none; }
    button:focus-visible, input:focus-visible, [tabindex='0']:focus-visible {
      outline: 2px solid var(--accent); outline-offset: 3px;
    }
    .gallery-toolbar {
      min-height: 76px; padding: 18px 26px; gap: 18px;
      border-bottom: 1px solid var(--border); box-shadow: 0 3px 22px #00000018;
      overflow: visible;
    }
    .gallery-brand {
      font-family: var(--obsidian-serif); font-size: 27px;
      font-weight: 400; letter-spacing: .015em; gap: 12px;
    }
    .gallery-brand > span {
      width: 22px; height: 33px; border-radius: 0;
      background: conic-gradient(from 20deg at 45% 42%, #b7afc3, #14131e 26%, #747080 39%, #242330 58%, #ccc5da 75%, #36333f 90%, #b7afc3);
      clip-path: polygon(53% 0, 94% 27%, 100% 67%, 54% 100%, 8% 76%, 0 33%);
      box-shadow: none;
    }
    .gallery-brand svg { display: none; }
    .gallery-toolbar button, .gallery-toolbar input {
      min-height: 34px; font-size: 10px; font-weight: 500; letter-spacing: .08em;
    }
    .gallery-toolbar [aria-label='View mode'] { gap: 3px; background: var(--input-bg); padding: 3px; border: 1px solid var(--border); }
    .gallery-toolbar [aria-pressed='true'] { background: var(--active-bg); color: var(--accent); border-color: var(--border-strong); }
    .gallery-toolbar button:not(:disabled):hover {
      background: var(--hover-bg); color: var(--text-primary); border-color: var(--accent);
      box-shadow: 0 0 14px #a99ac217; transform: none;
    }
    .gallery-folder-sidebar {
      background: linear-gradient(170deg, #9f8fb00a, transparent 42%), var(--panel-bg);
      border-right: 1px solid var(--border); box-shadow: 8px 0 30px #00000014;
      padding: 28px 14px; display: flex; flex-direction: column;
    }
    .gallery-folder-sidebar::before {
      content: 'Collections'; display: block; margin: 0 8px 24px;
      padding-bottom: 18px; border-bottom: 1px solid var(--border);
      font: 22px var(--obsidian-serif); color: var(--text-primary);
    }
    .gallery-folder-sidebar [role='tree'] { flex-shrink: 0; }
    .gallery-folder-sidebar [role='treeitem'] { font-size: 11px; min-height: 38px; border-radius: 0; }
    .gallery-folder-sidebar [role='treeitem'][aria-selected='true'] {
      background: linear-gradient(90deg, var(--active-bg), transparent);
      color: var(--accent); box-shadow: inset 1px 0 var(--accent);
    }
    .gallery-folder-sidebar::after {
      content: ''; display: block; flex-shrink: 0;
      width: 48px; height: 72px; margin: auto auto 0;
      clip-path: polygon(57% 0, 88% 19%, 100% 54%, 73% 88%, 36% 100%, 5% 68%, 0 30%);
      background:
        linear-gradient(122deg, transparent 44%, #b8aec57a 44.5%, transparent 46%),
        linear-gradient(32deg, transparent 47%, #a99cb530 48%, transparent 49%),
        conic-gradient(from 22deg at 46% 43%, #33303e, #0b0b11 25%, #514957 25.5%, #1a1722 43%, #08090d 62%, #635a70 62.5%, #24202e 78%, #33303e);
      opacity: .7; pointer-events: none;
    }
    .gallery-folder-sidebar [role='tree'] { margin-bottom: 24px; }
    .gallery-folder-toggle { background: var(--panel-bg); border-color: var(--border); box-shadow: none; }
    .gallery-pathbar { min-height: 50px; padding: 8px 32px; background: var(--bg-secondary); border-bottom: 1px solid var(--border); }
    .gallery-pathbar button { font-size: 9px; letter-spacing: .09em; font-weight: 500; min-height: 28px; }
    main { padding: 28px 32px 40px; background: var(--bg-primary); }
    .glass-card:not([data-gap='none']) {
      aspect-ratio: auto; display: flex; flex-direction: column;
      padding: 7px; border: 1px solid var(--border); border-radius: 1px;
      background: linear-gradient(138deg, #ffffff0c, transparent 34%, #ffffff03 72%, #ffffff0b), var(--card-bg);
      box-shadow: 0 5px 16px #00000024; transition: border-color 180ms, box-shadow 180ms;
    }
    .glass-card:not([data-gap='none']) .grid-image-preview {
      position: relative; inset: auto; aspect-ratio: 1; flex-shrink: 0;
      border: 1px solid var(--border); border-radius: 0;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption {
      position: relative; margin: 0; padding: 13px 24px 7px 4px;
      background: none; min-height: 34px;
    }
    .glass-card:not([data-gap='none']) .grid-image-caption > div { color: var(--text-secondary); font-size: 10px; letter-spacing: .055em; }
    .glass-card:not([data-gap='none']) .grid-image-caption > div:first-child { color: var(--text-primary); font-weight: 400; }
    .glass-card:not([data-gap='none']) .grid-image-caption::after {
      content: '◇'; position: absolute; top: 9px; right: 4px; color: var(--text-muted); font: 17px var(--obsidian-serif);
    }
    .glass-card:not([data-gap='none']):is(:hover, :focus-within) { border-color: var(--accent); box-shadow: 0 10px 28px #00000040, inset 0 0 12px #bcaed90b; }
    .glass-card:is(:focus-within, [data-selected='true']) .grid-image-overlay { opacity: 1; }
    .glass-overlay-control { background: #101017db; color: #ded7e8; border: 1px solid #82758d; border-radius: 2px; box-shadow: none; width: 28px; height: 28px; }
    .glass-overlay-control:is([aria-checked='true'], [aria-pressed='true']) { background: #c6bfd8; color: #131019; border-color: #e4e0e9; }
    aside[role='dialog'] { border-left: 1px solid var(--border-strong); box-shadow: -20px 0 50px #00000040; }
    aside[role='dialog'] h2 { font: 38px var(--obsidian-serif); letter-spacing: -.02em; }
    aside[role='dialog'] h3 { border-top: 1px solid var(--border); padding-top: 20px; font-size: 10px; font-weight: 500; letter-spacing: .16em; }
    aside[role='dialog'] button { box-shadow: none; }
    aside[role='dialog'] button[data-active='true'] { border-color: var(--accent); box-shadow: inset 0 0 16px #ae9ac414; }
    input[type='range'] { accent-color: var(--accent); }
    .gallery-lightbox { background: #08090df7; }
    .gallery-lightbox .lightbox-control-layer { border-radius: 2px; backdrop-filter: none; box-shadow: none; }
    .gallery-lightbox .lightbox-toolbar { background: #101117ef; border-bottom: 1px solid #47404f; }
    .gallery-lightbox .lightbox-filmstrip { background: #101117ef; border-top: 1px solid #47404f; }
    .gallery-lightbox .lightbox-filmstrip button[data-active='true'] { border-color: #c6bfd8; }
    .gallery-empty { min-height: 500px; padding: 28px; }
    .gallery-empty::before, .gallery-empty::after { display: none; }
    .gallery-empty [role='region'] {
      width: min(720px, 100%); padding: 62px 44px 44px;
      border: 1px solid var(--border-strong); border-radius: 45% 45% 2px 2px / 25% 25% 2px 2px;
      box-shadow: 0 20px 80px #00000030, inset 0 0 0 7px var(--bg-primary), inset 0 0 0 8px var(--border);
      background: linear-gradient(145deg, #a593b810, transparent 50%), var(--surface-strong);
    }
    .gallery-empty .empty-gallery-mark {
      width: 66px; height: 88px; border-radius: 0;
      background: conic-gradient(from 25deg, #aaa2b6, #15131d 26%, #63586f 46%, #0c0b12 69%, #bdb4ca);
      clip-path: polygon(50% 0, 91% 29%, 100% 64%, 57% 100%, 8% 77%, 0 30%); box-shadow: none;
    }
    .empty-gallery-mark svg { opacity: 0; }
    #empty-gallery-title { font: 400 clamp(36px, 4vw, 58px)/1.05 var(--obsidian-serif); letter-spacing: -.025em; max-width: 540px; }
    #empty-gallery-description { max-width: 400px; line-height: 1.7; font-size: 13px; }
    .gallery-empty button { padding: 14px 26px; font-size: 10px; letter-spacing: .12em; box-shadow: none; }
    .obsidian-footer {
      flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;
      gap: 16px; padding: 12px 26px; background: var(--bg-secondary); color: var(--text-muted);
      border-top: 1px solid var(--border); font-size: 9px; letter-spacing: .08em;
    }
    .obsidian-footer b { margin: 0 10px; color: var(--accent); font-weight: 400; }
    .obsidian-footer i { margin: 0 12px; opacity: .5; }
    @media (max-width: 1100px) {
      .gallery-toolbar { flex-wrap: wrap; gap: 10px; padding: 12px 18px; }
      .gallery-pathbar { flex-wrap: wrap; gap: 6px; padding: 10px 24px; }
    }
    @media (max-width: 700px) {
      .gallery-toolbar { gap: 8px; padding: 12px; }
      .gallery-toolbar > div:first-child { gap: 8px; }
      .gallery-brand > span { width: 18px; height: 28px; }
      .gallery-folder-sidebar { position: absolute; inset: 0 auto 0 0; z-index: 90; }
      .gallery-folder-toggle { z-index: 91; }
      .gallery-toolbar > div:has(input) { order: 2; flex: 1 0 100%; }
      .gallery-toolbar > div:has(input) > div { width: 100%; }
      .gallery-toolbar input { width: 100%; }
      .gallery-toolbar > div:empty { display: none; }
      .gallery-brand { font-size: 22px; gap: 8px; }
      .gallery-pathbar { padding: 8px 16px; }
      main { padding: 18px 16px; }
      [data-view-mode='grid'] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .glass-card:not([data-gap='none']) { padding: 4px; }
      .glass-card:not([data-gap='none']) .grid-image-caption { padding: 10px 2px 6px; }
      .glass-card:not([data-gap='none']) .grid-image-caption > div { font-size: 8px; letter-spacing: 0; }
      .grid-image-caption::after { display: none; }
      .obsidian-footer { padding: 10px; font-size: 8px; letter-spacing: 0; }
      .obsidian-footer > span:last-child { display: none; }
      .gallery-empty { padding: 8px; min-height: 450px; }
      .gallery-empty [role='region'] { padding: 44px 24px 32px; }
    }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; } }
  }
`
