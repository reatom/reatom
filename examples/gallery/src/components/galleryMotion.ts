/** Product-local entry motion; unsupported @starting-style stays fully visible. */
export const galleryFadeInCss = `
  opacity: 1;
  @starting-style {
    opacity: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const galleryCardMotionCss = `
  transition:
    opacity 180ms ease-out,
    background-color 180ms ease-out,
    border-color 180ms ease-out,
    box-shadow 180ms ease-out,
    transform 180ms ease-out;
  ${galleryFadeInCss}
`

export const galleryThumbnailMotionCss = `
  transition: opacity 180ms ease-out;
  ${galleryFadeInCss}
`
