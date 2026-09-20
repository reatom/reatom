export const lightboxChromeCss = `
  opacity: var(--control-opacity);
  pointer-events: var(--control-pointer);
  transition: ${import.meta.env.TEST ? 'none' : 'opacity 0.35s ease'};
  &:focus-within {
    opacity: 1;
    pointer-events: auto;
  }
`
