import { computed } from '@reatom/core'

import { focusableCardAttrs } from '../a11y'
import { resolveImageOrientationStyle } from '../image-engine/orientation'
import { splitFileNameForTruncation } from '../imageFormat'
import type { ImageModel } from '../model'
import {
  gridGap,
  hideLoupe,
  ignoreExifOrientation,
  imageFit,
  imageGrid,
  openLightbox,
  showFileSizes,
  showImageNames,
  showLoupe,
} from '../model'
import { ImageFavoriteButton, ImageSelectButton } from './ImageControls'

const overlayControlCss = `
  pointer-events: auto;
  width: var(--overlay-control-size);
  height: var(--overlay-control-size);
  border-radius: var(--overlay-control-radius);
  -webkit-backdrop-filter: var(--overlay-control-backdrop, none);
  backdrop-filter: var(--overlay-control-backdrop, none);
  &[data-ui] svg {
    width: min(var(--_icon-size), calc(var(--overlay-control-size) * 0.62));
    height: min(var(--_icon-size), calc(var(--overlay-control-size) * 0.62));
  }
`

export const GridImage = ({ image }: { image: ImageModel }) => {
  const imageName = () => image.source.name

  const hasThumbnail = computed(
    () =>
      image.previewLoadPriority() !== 'off' && Boolean(image.thumbnail.data()),
    `gridImage.${image.id}.hasThumbnail`,
  )
  const displayImage = () =>
    hasThumbnail() ? (
      <img
        src={() => image.thumbnail.data()?.url ?? ''}
        alt={imageName()}
        loading="lazy"
        style:image-orientation={() =>
          resolveImageOrientationStyle(
            image.thumbnailMeta.data()?.exif,
            ignoreExifOrientation(),
            image.thumbnail.data()?.orientationBaked ||
              image.display.isRawPipeline(),
          )
        }
      />
    ) : null

  const openLabel = () => `Open ${imageName()}`

  return (
    <div
      {...focusableCardAttrs(openLabel, () => openLightbox(image))}
      attr:data-selected={image.selected}
      attr:data-gap={gridGap}
      attr:data-density={imageGrid.density}
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
        contain-intrinsic-size: var(--item-size, 220px);

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
        &[data-density='compact'] {
          --overlay-control-size: 24px;
          --overlay-control-inset: 6px;
        }
        &[data-density='tiny'] {
          --overlay-control-size: 20px;
          --overlay-control-inset: 4px;
        }
        &[data-density='micro'] {
          --overlay-control-size: 16px;
          --overlay-control-inset: 2px;
        }
        &[data-density='micro']:not(:hover):not(:focus-within)
          [data-ui-slot='overlay']:is(
            [aria-pressed='false'],
            [role='checkbox'][aria-checked='false']
          ) {
          opacity: 0;
        }
        [data-ui-slot='overlay'] {
          -webkit-backdrop-filter: var(--overlay-slot-filter, none);
          backdrop-filter: var(--overlay-slot-filter, none);
        }
      `}
      on:click={() => openLightbox(image)}
      on:pointerenter={(event) => {
        if (event.pointerType !== 'mouse') return
        showLoupe(image, event.currentTarget)
      }}
      on:pointerleave={() => hideLoupe()}
      on:focus={(event) => {
        if (!event.currentTarget.matches(':focus-visible')) return
        showLoupe(image, event.currentTarget, { immediate: true })
      }}
      on:blur={() => hideLoupe()}
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
            top: var(--overlay-control-inset, 8px);
            left: var(--overlay-control-inset, 8px);
            ${overlayControlCss}
          `}
        />

        <ImageFavoriteButton
          image={image}
          slot="overlay"
          css={`
            position: absolute;
            top: var(--overlay-control-inset, 8px);
            right: var(--overlay-control-inset, 8px);
            ${overlayControlCss}
          `}
        />
      </div>

      {() => {
        const density = imageGrid.density()
        if (density === 'tiny' || density === 'micro') return null

        const showName = showImageNames()
        const showSize = showFileSizes() && density !== 'compact'
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
                <span
                  data-name
                  css="display: inline-flex; max-width: 100%; min-width: 0; vertical-align: top;"
                >
                  <span
                    data-name-head
                    css="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                  >
                    {() => splitFileNameForTruncation(imageName()).head}
                  </span>
                  <span data-name-tail css="flex-shrink: 0; white-space: pre;">
                    {() => splitFileNameForTruncation(imageName()).tail}
                  </span>
                </span>
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
