import type { ImageModel } from '../model'
import {
  gridGap,
  imageFit,
  openLightbox,
  selectImage,
  showFileSizes,
  showImageNames,
} from '../model'

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export const GridImage = ({ image }: { image: ImageModel }) => {
  const isSelected = () => image.selected()
  const isFavorite = () => image.favorite()

  const handleOpen = () => openLightbox(image)

  return (
    <div
      attr:data-selected={isSelected}
      attr:data-gap={gridGap}
      css={`
        position: relative;
        min-width: 0;
        aspect-ratio: 1;
        background: var(--card-bg);
        border: 1px solid var(--card-border);
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px var(--shadow);
        }
        &:hover .grid-image-overlay {
          opacity: 1;
        }
        &[data-selected='true'] {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent);
        }
        &[data-gap='none'] {
          border-width: 0;
          border-radius: 0;
        }
      `}
      on:click={handleOpen}
    >
      <div
        css={`
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.1);
        `}
      >
        <img
          src={() => image.thumbnail.data()?.url ?? ''}
          alt={image.name}
          loading="lazy"
          style:object-fit={imageFit}
          css="width: 100%; height: 100%; display: block;"
        />
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
          on:click={(e: Event) => {
            e.stopPropagation()
            selectImage(image)
          }}
          aria-checked={isSelected}
          css={`
            position: absolute;
            top: 8px;
            left: 8px;
            width: 24px;
            height: 24px;
            border-radius: 6px;
            border: 2px solid rgba(255, 255, 255, 0.8);
            background: rgba(0, 0, 0, 0.4);
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
            }
            &:hover {
              transform: scale(1.1);
            }
          `}
        >
          {() => (isSelected() ? '✓' : '')}
        </button>

        <button
          on:click={image.favorite.toggle}
          aria-pressed={isFavorite}
          type="button"
          css={`
            position: absolute;
            top: 8px;
            right: 8px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: rgba(0, 0, 0, 0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            pointer-events: auto;
            transition: all 0.15s ease;

            &:hover {
              transform: scale(1.15);
              background: rgba(0, 0, 0, 0.6);
            }
          `}
        >
          {() => (isFavorite() ? '❤️' : '🤍')}
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
              padding: 8px 10px;
              background: linear-gradient(
                to top,
                rgba(0, 0, 0, 0.72),
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
                {image.name}
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
