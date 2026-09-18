/** Optical edge treatment shared by the gallery and viewer. */
export const crystalSurfaceCss = `
  border: 1px solid var(--liquid-edge, #58617430);
  background:
    linear-gradient(165deg, #ffffff30, transparent 42%, #ffffff0c),
    var(--liquid-fill, #ffffff18);
  box-shadow:
    0 8px 24px -8px #18233326,
    0 2px 5px -2px #18233320,
    inset 0 1px 1px #ffffffb0,
    inset 0 -1px 1px #ffffff60,
    inset 0 3px 6px -3px #ffffff90,
    inset 0 -3px 6px -3px #ffffff50,
    inset 1px 0 2px #ffffff30,
    inset -1px 0 2px #24304718;
`

export const crystalChipCss = `
  border: 1px solid var(--liquid-edge, #58617430);
  background: var(--liquid-control, rgba(255,255,255,.32));
  box-shadow: inset 0 1px 1px #ffffff90, 0 2px 4px #18233312;
  color: var(--text-primary);
`

// The highlight follows the silhouette. An inset ring creates a second outline
// and mismatched corner arcs, which reads as a plastic frame instead of a lens.
export const crystalRimCss = `
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(155deg,
    #ffffffed 2%, #ffffff70 18%, #ffffff08 38%,
    #29374a28 54%, #ffffff18 70%, #ffffffb0 92%);
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  z-index: 2;
  opacity: var(--crystal-rim-opacity, 1);
`
