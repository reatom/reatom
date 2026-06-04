import { focusableCardAttrs } from '../a11y'
import type { ImageModel } from '../model'
import { resolveImageOrientationStyle } from '../image-engine/orientation'
import {
  gridGap,
  ignoreExifOrientation,
  imageFit,
  openLightbox,
  selectImage,
  showFileSizes,
  showImageNames,
} from '../model'
import { CheckIcon, HeartIcon } from './Icons'

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const getPreviewSize = (
  thumbnailWidth: number,
  thumbnailHeight: number,
  fit: ReturnType<typeof imageFit>,
) => {
  return fit === 'cover' || fit === 'fill'
    ? Math.min(thumbnailWidth, thumbnailHeight)
    : Math.max(thumbnailWidth, thumbnailHeight)
}

export const GridImage = ({
  image,
  renderedSize,
}: {
  image: ImageModel
  renderedSize: () => number
}) => {
  const isSelected = () => image.selected()
  const isFavorite = () => image.favorite()
  const imageName = () => image.source.name

  const handleOpen = () => openLightbox(image)
  const displayImage = () => {
    const thumbnail = image.thumbnail.data()
    if (!thumbnail) return null

    const previewSize = getPreviewSize(
      thumbnail.width,
      thumbnail.height,
      imageFit(),
    )
    const fullImage =
      renderedSize() > previewSize ? image.fullImage.data() : undefined

    if (fullImage) {
      fullImage.alt = imageName()
      fullImage.loading = 'lazy'
      const orientationStyle = resolveImageOrientationStyle(
        image.meta.data()?.exif,
        ignoreExifOrientation(),
      )
      if (orientationStyle) {
        fullImage.style.imageOrientation = orientationStyle
      } else {
        fullImage.style.removeProperty('image-orientation')
      }
      return fullImage
    }

    const orientationStyle = resolveImageOrientationStyle(
      image.meta.data()?.exif,
      ignoreExifOrientation(),
      thumbnail.orientationBaked,
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
      {...focusableCardAttrs(openLabel(), handleOpen)}
      attr:data-selected={isSelected}
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
        &:hover {
          border-color: var(--accent);
          transform: var(--card-hover-transform);
          box-shadow: var(--card-hover-shadow);
        }
        &:hover .grid-image-overlay {
          opacity: 1;
        }
        &[data-selected='true'] {
          border-color: var(--accent);
          box-shadow: var(--selected-shadow);
        }
        &[data-gap='none'] {
          border-width: 0;
          border-radius: 0;
        }
      `}
      on:click={handleOpen}
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
        class="grid-image-overlay"
        css={`
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.15s ease;
          pointer-events: none;
        `}
      >
        <button
          type="button"
          on:click={(e: Event) => {
            e.stopPropagation()
            selectImage(image)
          }}
          role="checkbox"
          aria-checked={isSelected}
          aria-label={() =>
            isSelected() ? `Deselect ${imageName()}` : `Select ${imageName()}`
          }
          css={`
            position: absolute;
            top: 8px;
            left: 8px;
            width: 24px;
            height: 24px;
            border-radius: var(--radius-sm);
            border: var(--border-width) var(--control-border-style)
              rgba(255, 255, 255, 0.82);
            background: var(--overlay-control);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: white;
            pointer-events: auto;
            transition: all 0.15s ease;

            &[aria-checked='true'] {
              background: var(--accent);
              border-color: var(--accent);
              color: var(--accent-contrast);
            }
            &:hover {
              transform: scale(1.1);
            }
          `}
        >
          {() => (isSelected() ? <CheckIcon /> : null)}
        </button>

        <button
          on:click={(e: Event) => {
            e.stopPropagation()
            image.favorite.toggle()
          }}
          aria-pressed={isFavorite}
          aria-label={() =>
            isFavorite()
              ? `Remove ${imageName()} from favorites`
              : `Add ${imageName()} to favorites`
          }
          type="button"
          css={`
            position: absolute;
            top: 8px;
            right: 8px;
            width: 28px;
            height: 28px;
            border-radius: var(--radius-round);
            border: var(--border-width) var(--control-border-style) transparent;
            background: var(--overlay-control);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            color: #fff;
            pointer-events: auto;
            transition: all 0.15s ease;

            &[aria-pressed='true'] {
              color: var(--accent);
              background: var(--overlay-control-hover);
            }

            &:hover {
              transform: scale(1.15);
              box-shadow: var(--glow);
              background: var(--overlay-control-hover);
            }
          `}
        >
          {() => <HeartIcon filled={isFavorite()} />}
        </button>
      </div>

      {() => {
        const showName = showImageNames()
        const showSize = showFileSizes()
        if (!showName && !showSize) return null
        return (
          <div
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
                {formatBytes(image.source.size)}
              </div>
            )}
          </div>
        )
      }}
    </div>
  )
}
