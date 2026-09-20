import { focusableCardAttrs } from '../a11y'
import type { ImageModel } from '../model'
import { listPreviewHeight, listPreviewWidth, openLightbox } from '../model'
import { FolderImageTree, PreviewBoundImage } from './FolderImageTree'
import { ImageFavoriteButton, ImageSelectButton } from './ImageControls'

const ListImage = ({ image }: { image: ImageModel }) => {
  const displayThumbnail = () => {
    if (image.previewLoadPriority() === 'off') return null

    const thumbnail = image.thumbnail.data()
    return thumbnail ? (
      <img src={thumbnail.url} alt={image.name} loading="lazy" />
    ) : null
  }

  const openLabel = () => `Open ${image.name}`

  return (
    <div
      {...focusableCardAttrs(openLabel, () => openLightbox(image))}
      attr:data-selected={image.selected}
      css:preview-width={() => `${listPreviewWidth()}px`}
      css:preview-height={() => `${listPreviewHeight()}px`}
      on:click={() => openLightbox(image)}
      css={`
        &:focus-visible {
          outline: 3px solid var(--focus-ring);
          outline-offset: 2px;
        }
        display: grid;
        grid-template-columns: 34px var(--preview-width) minmax(0, 1fr) auto;
        align-items: center;
        gap: 14px;
        min-width: 0;
        padding: 10px 12px;
        border: var(--border-width) var(--border-style) var(--card-border);
        border-radius: var(--radius-md);
        background-color: var(--card-bg);
        background-image: var(--card-bg-image);
        background-size: var(--surface-bg-size);
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          border-color: var(--accent);
          transform: var(--card-hover-transform);
          box-shadow: var(--card-hover-shadow);
        }
        &[data-selected='true'] {
          border-color: var(--accent);
          box-shadow: var(--selected-shadow);
        }
      `}
    >
      <ImageSelectButton image={image} css="width: 26px; height: 26px;" />

      <div
        css={`
          width: var(--preview-width);
          height: var(--preview-height);
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--input-bg);

          > img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
        `}
      >
        {displayThumbnail}
      </div>

      <div css="min-width: 0;">
        <div
          css={`
            font-size: 14px;
            font-weight: 650;
            color: var(--text-primary);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
        >
          {image.name}
        </div>
        <div
          css={`
            margin-top: 4px;
            font-size: 12px;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
        >
          {image.source.relativePath || image.source.path}
        </div>
        <div css="margin-top: 5px; font-size: 12px; color: var(--text-secondary);">
          {image.display.summaryLabel}
        </div>
      </div>

      <ImageFavoriteButton image={image} css="width: 34px; height: 34px;" />
    </div>
  )
}

export const ImageList = () => (
  <FolderImageTree
    renderImage={(image, folder) => (
      <PreviewBoundImage image={image} folder={folder}>
        <ListImage image={image} />
      </PreviewBoundImage>
    )}
  />
)
