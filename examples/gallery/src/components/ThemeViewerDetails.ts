import { crystalRimCss, crystalSurfaceCss } from './CrystalMaterial'

/** Carry each theme's materials into the full-size image viewer. */
export const themeViewerCss = `
  &[data-theme-pack='glass'] #gallery-lightbox {
    background: #191b1f;
    /* Filter the host's backdrop before its own border/shadow are painted.
       A filtered pseudo-element can sample the host's rim at opacity: 1;
       ancestor opacity during fading then changes that backdrop root. */
    :is(#lightbox-toolbar, #lightbox-filmstrip, #slideshow-controls, #lightbox-scrubber) {
      ${crystalSurfaceCss}
      border-radius: 28px;
      color: #fff;
      -webkit-backdrop-filter: blur(18px) saturate(1.15);
      backdrop-filter: blur(18px) saturate(1.15);
    }
    :is(#lightbox-toolbar, #lightbox-filmstrip, #slideshow-controls, #lightbox-scrubber)::after { ${crystalRimCss} }
    #lightbox-toolbar {
      inset: 16px 20px auto;
      padding: 12px 18px;
    }
    :is(#lightbox-toolbar, #lightbox-filmstrip, #slideshow-controls, #lightbox-scrubber, #gallery-lightbox > [data-ui]) input:focus-visible {
      outline: 2px solid #0867d5;
      outline-offset: 2px;
      box-shadow: 0 0 0 2px #fff;
    }
    > [data-ui] {
      border-radius: 50%;
      width: 60px; height: 60px;
    }
    #lightbox-filmstrip {
      left: 50%; right: auto; bottom: 12px;
      transform: translateX(-50%);
      max-width: calc(100% - 32px);
      padding: 12px 16px;
    }
    #slideshow-controls { bottom: 92px; padding: 10px 16px; }
    #lightbox-scrubber { bottom: 92px; padding: 14px 20px; gap: 8px; }
    @media (max-width: 1000px) {
      #lightbox-scrubber { bottom: 154px; min-width: 180px; }
    }
  }
  &[data-theme-pack='glass'][data-theme-mode='light'] #gallery-lightbox {
    background: #e1e3e6;
    :is(#lightbox-toolbar, #lightbox-filmstrip, #slideshow-controls, #lightbox-scrubber) { color: #202020; --liquid-fill: #ffffff20; }
    #lightbox-toolbar > span { color: #202020; }
  }
  &[data-theme-pack='glass'][data-glass-refraction='true'] #gallery-lightbox :is(#lightbox-toolbar, #lightbox-filmstrip, #slideshow-controls, #lightbox-scrubber, #gallery-lightbox > [data-ui]) {
    backdrop-filter: blur(2px) var(--glass-optics, blur(8px));
  }
  @media (max-width: 600px) {
    &[data-theme-pack='glass'][data-glass-refraction='true'] #gallery-lightbox > [data-ui] {
      backdrop-filter: blur(12px) saturate(1.15);
    }
  }
  @media (prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active) {
    &[data-theme-pack='glass'] #gallery-lightbox :is(#lightbox-toolbar, #lightbox-filmstrip, #slideshow-controls, #lightbox-scrubber) {
      background: #2b2b2b; color: #fff; -webkit-backdrop-filter: none; backdrop-filter: none;
    }
    &[data-theme-pack='glass'] #gallery-lightbox :is(#lightbox-toolbar, #lightbox-filmstrip, #slideshow-controls, #lightbox-scrubber, #gallery-lightbox > [data-ui])::after { display: none; }
  }
  &[data-theme-pack='polaroid'] #gallery-lightbox {
    --lightbox-vertical-chrome: 280px;
    background: radial-gradient(ellipse at 50% 38%, #514b40, #242521 78%);
    #lightbox-stage { padding: 100px 80px 180px; }
    #lightbox-print {
      position: relative;
      flex-shrink: 0;
      isolation: isolate;
    }
    #lightbox-print::before {
      content: '';
      position: absolute;
      inset: -12px -12px -46px;
      z-index: -1;
      background: linear-gradient(115deg, #fffdf7, #eee6d7);
      border-radius: 2px;
      box-shadow: 0 24px 60px #0008, 0 3px 6px #0005;
      pointer-events: none;
    }
    #lightbox-print::after {
      content: attr(data-caption);
      position: absolute;
      top: 100%; left: 0; right: 0;
      padding-top: 13px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #534a3c;
      text-align: center;
      font: 16px 'Bradley Hand', 'Segoe Print', cursive;
      pointer-events: none;
    }
    #lightbox-toolbar {
      inset: 16px 20px auto;
      padding: 0;
      background: none;
      border: 0;
    }
    #lightbox-toolbar > span {
      padding: 10px 18px;
      background: #f4ebd8;
      color: #534a3c;
      box-shadow: 2px 3px 8px #0003;
      transform: rotate(-2deg);
      font: 20px 'Bradley Hand', 'Segoe Print', cursive;
    }
    #lightbox-toolbar > div {
      padding: 6px;
      background: #272823;
      border: 1px solid #eee6d733;
      border-radius: 8px;
      box-shadow: 0 4px 12px #0003;
    }
    > [data-ui='button'] {
      border-radius: 50%;
    }
    #lightbox-filmstrip {
      left: 50%; right: auto; bottom: 10px;
      transform: translateX(-50%);
      max-width: calc(100% - 32px);
      justify-content: flex-start;
      gap: 12px; padding: 10px 14px;
      background: transparent;
    }
    #lightbox-filmstrip [data-ui='button'] {
      padding: 4px 4px 12px;
      border-radius: 1px;
    }
    #slideshow-controls, #lightbox-scrubber {
      bottom: 92px;
      padding: 8px 12px;
      background: #272823;
      color: #f4ebd8;
      border: 1px solid #f4ebd833;
      border-radius: 6px;
      box-shadow: 0 4px 12px #0003;
      backdrop-filter: none;
    }
    #lightbox-scrubber { min-width: 180px; }
    @media (max-width: 1000px) {
      #slideshow-controls { left: 20px; transform: none; }
    }
    @media (max-width: 680px) {
      --lightbox-vertical-chrome: 320px;
      #lightbox-stage { padding-top: 110px; padding-bottom: 210px; }
      #lightbox-toolbar { inset: 12px; align-items: flex-start; gap: 12px; }
      #lightbox-toolbar > span { padding: 8px; font-size: 16px; white-space: nowrap; }
      #lightbox-toolbar > div { flex-wrap: wrap; justify-content: flex-end; gap: 2px; }
      #lightbox-toolbar [data-ui='button'] { width: 30px; height: 32px; }
      #slideshow-controls { left: 50%; transform: translateX(-50%); gap: 2px; padding: 6px; }
      #slideshow-controls [role='progressbar'] { width: 28px; }
      #lightbox-scrubber { bottom: 140px; right: 20px; left: 20px; padding: 6px 12px; }
    }
  }
  &[data-theme-pack='retroOs'] #gallery-lightbox {
    background: radial-gradient(ellipse at 50% 40%, #34595a, #142d30);
    #lightbox-toolbar {
      inset: 8px 8px auto;
      background: var(--retro-title);
      border: 3px solid var(--retro-face);
      box-shadow: var(--retro-raised), 3px 3px 0 #0005;
      padding: 6px 10px;
    }
    #lightbox-toolbar > span { font: bold 14px Tahoma, sans-serif; color: #fff; }
    #lightbox-print { box-shadow: 0 0 0 5px var(--retro-face), 0 0 0 6px var(--retro-edge), 8px 10px 0 #0005; }
    #lightbox-filmstrip {
      background: var(--retro-face);
      border-top: 1px solid var(--retro-light);
      padding: 8px 16px;
    }
    #lightbox-filmstrip [data-ui='button'] { border-radius: 0; }
    #slideshow-controls, #lightbox-scrubber {
      bottom: 80px;
      background: var(--retro-face);
      color: var(--retro-ink);
      border: 1px solid var(--retro-edge);
      border-radius: 0;
      box-shadow: var(--retro-raised), 3px 3px 0 #0004;
      backdrop-filter: none;
    }
    @media (max-width: 1000px) {
      #lightbox-scrubber { bottom: 134px; }
    }
  }
  @media (max-width: 600px) {
    &[data-theme-pack='glass'] #gallery-lightbox #lightbox-toolbar { inset: 8px 8px auto; padding: 8px; }
    &[data-theme-pack='glass'] #gallery-lightbox > [data-ui='button'] { width: 44px; height: 44px; }
  }
`
