import { focusableCardAttrs } from '../a11y'
import { resolveImageOrientationStyle } from '../image-engine/orientation'
import type { ImageModel } from '../model'
import {
  gridGap,
  ignoreExifOrientation,
  imageFit,
  openLightbox,
  showFileSizes,
  showImageNames,
} from '../model'
import { ImageFavoriteButton, ImageSelectButton } from './ImageControls'

const overlayControlCss = `
  pointer-events: auto;
  width: var(--overlay-control-size);
  height: var(--overlay-control-size);
  border-radius: var(--overlay-control-radius);
  -webkit-backdrop-filter: var(--overlay-control-backdrop, none);
  backdrop-filter: var(--overlay-control-backdrop, none);
`

export const GridImage = ({ image }: { image: ImageModel }) => {
  const imageName = () => image.source.name

  const displayImage = () => {
    if (image.previewLoadPriority() === 'off') return null

    const thumbnail = image.thumbnail.data()
    if (!thumbnail) return null

    const orientationStyle = resolveImageOrientationStyle(
      image.thumbnailMeta.data()?.exif,
      ignoreExifOrientation(),
      thumbnail.orientationBaked || image.display.isRawPipeline(),
    )

    return (
      <img
        src={thumbnail.url}
        alt={imageName()}
        loading="lazy"
        style:image-orientation={orientationStyle}
      />
    )
  }

  const openLabel = () => `Open ${imageName()}`

  return (
    <div
      {...focusableCardAttrs(openLabel, () => openLightbox(image))}
      attr:data-selected={image.selected}
      attr:data-gap={gridGap}
      css={`
        position: relative;
        min-width: 0;
        aspect-ratio: 1;
        padding: var(--card-padding);
        background-color: var(--card-bg);
        background-image: var(--card-bg-image);
        background-size: var(--surface-bg-size);
        border: var(--border-width) var(--border-style) var(--card-border);
        border-radius: var(--radius-md);
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s ease;
        content-visibility: auto;
        contain-intrinsic-size: 220px;

        &:focus-visible {
          outline: 3px solid var(--focus-ring);
          outline-offset: 2px;
        }
        --overlay-opacity: 0;
        &:hover {
          --overlay-opacity: 1;
        }
        &:focus-within {
          --overlay-opacity: 1;
          content-visibility: visible;
        }
        @media (hover: none) {
          --overlay-opacity: 1;
        }
        &:hover {
          border-color: var(--accent);
          transform: var(--card-hover-transform);
          box-shadow: var(--card-hover-shadow);
        }
        &[data-selected='true'] {
          border-color: var(--accent);
          box-shadow: var(--selected-shadow);
          --overlay-opacity: 1;
        }
        &[data-gap='none'] {
          border-width: 0;
          border-radius: 0;
        }
        [data-ui-slot='overlay'] {
          background: var(--overlay-slot-bg);
          color: var(--overlay-slot-color);
          border-color: var(--overlay-slot-border);
          -webkit-backdrop-filter: var(--overlay-slot-filter, none);
          backdrop-filter: var(--overlay-slot-filter, none);
        }
      `}
      on:click={() => openLightbox(image)}
    >
      <div
        css:image-fit={imageFit}
        css={`
          position: absolute;
          inset: var(--card-padding);
          overflow: hidden;
          background: var(--input-bg);
          border-radius: var(--radius-sm);
          > img {
            width: 100%;
            height: 100%;
            object-fit: var(--image-fit);
            display: block;
          }
        `}
      >
        {displayImage}
      </div>

      <div
        css={`
          position: absolute;
          inset: 0;
          opacity: var(--overlay-opacity);
          transition: ${import.meta.env.TEST ? 'none' : 'opacity 0.15s ease'};
          pointer-events: none;
        `}
      >
        <ImageSelectButton
          image={image}
          slot="overlay"
          css={`
            position: absolute;
            top: 8px;
            left: 8px;
            width: 24px;
            height: 24px;
            ${overlayControlCss}
          `}
        />

        <ImageFavoriteButton
          image={image}
          slot="overlay"
          css={`
            position: absolute;
            top: 8px;
            right: 8px;
            width: 28px;
            height: 28px;
            ${overlayControlCss}
          `}
        />
      </div>

      {() => {
        const showName = showImageNames()
        const showSize = showFileSizes()
        if (!showName && !showSize) return null
        return (
          <div
            attr:data-caption={imageName}
            css={`
              position: absolute;
              right: 0;
              bottom: 0;
              left: 0;
              margin: var(--card-padding);
              border-radius: 0 0 var(--radius-sm) var(--radius-sm);
              padding: 8px 10px;
              background: linear-gradient(
                to top,
                var(--image-overlay),
                rgba(0, 0, 0, 0)
              );
            `}
          >
            {showName && (
              <div
                css={`
                  font-size: 12px;
                  font-weight: 500;
                  color: #fff;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                `}
              >
                {imageName}
              </div>
            )}
            {showSize && (
              <div
                css={`
                  font-size: 11px;
                  color: rgba(255, 255, 255, 0.72);
                  margin-top: 2px;
                `}
              >
                {image.display.sizeLabel}
              </div>
            )}
          </div>
        )
      }}
    </div>
  )
}
