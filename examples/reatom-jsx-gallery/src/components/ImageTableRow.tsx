import { focusableRowAttrs } from '../a11y'
import type { ImageModel } from '../model'
import {
  openLightbox,
  selectImage,
  tablePreviewHeight,
  tablePreviewWidth,
} from '../model'
import { CheckIcon, HeartIcon } from './Icons'
import { formatBytes, formatDate, formatDimensions } from './imageGridFormat'

export const tableCellCss = `
  min-width: 0;
  padding: 8px 10px;
  border-bottom: var(--border-width) var(--border-style) var(--card-border);
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.35;
  vertical-align: top;
  overflow-wrap: anywhere;
`

export const ImageTableRow = ({
  image,
  exifColumns,
}: {
  image: ImageModel
  exifColumns: string[]
}) => {
  const isSelected = () => image.selected()
  const isFavorite = () => image.favorite()
  const displayThumbnail = () => {
    const thumbnail = image.thumbnail.data()
    return thumbnail ? (
      <img src={thumbnail.url} alt={image.name} loading="lazy" />
    ) : null
  }

  const dimensions = () =>
    formatDimensions(image.width(), image.height(), 'Pending')

  const openLabel = `Open ${image.name}`

  return (
    <tr
      {...focusableRowAttrs(openLabel, () => openLightbox(image))}
      attr:data-selected={isSelected}
      css:preview-width={() => `${tablePreviewWidth()}px`}
      css:preview-height={() => `${tablePreviewHeight()}px`}
      on:click={() => openLightbox(image)}
      css={`
        cursor: pointer;
        transition: background 0.15s ease;

        &:hover {
          background: var(--hover-bg);
        }
        &:focus-visible {
          outline: 3px solid var(--focus-ring);
          outline-offset: -2px;
        }
        &[data-selected='true'] {
          background: var(--accent-soft);
        }
      `}
    >
      <td
        css={`
          ${tableCellCss}
          vertical-align: middle;
        `}
      >
        <button
          on:click={(e: Event) => {
            e.stopPropagation()
            selectImage(image)
          }}
          role="checkbox"
          aria-checked={isSelected}
          aria-label={() =>
            isSelected() ? `Deselect ${image.name}` : `Select ${image.name}`
          }
          type="button"
          css={`
            width: 24px;
            height: 24px;
            border-radius: var(--radius-sm);
            border: var(--border-width) var(--control-border-style)
              var(--input-border);
            background: var(--input-bg);
            color: var(--accent-contrast);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-inline: auto;

            &[aria-checked='true'] {
              background: var(--accent);
              border-color: var(--accent);
            }
          `}
        >
          {() => (isSelected() ? <CheckIcon /> : null)}
        </button>
      </td>
      <td css={tableCellCss}>
        <div
          css={`
            width: min(var(--preview-width), 100%);
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
      </td>
      <td css={tableCellCss}>
        <div css="min-width: 0;">
          <div
            css={`
              font-weight: 650;
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
              color: var(--text-muted);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            `}
          >
            {image.source.relativePath || image.source.path}
          </div>
        </div>
      </td>
      <td css={tableCellCss}>{formatBytes(image.source.size)}</td>
      <td css={tableCellCss}>{dimensions}</td>
      <td css={tableCellCss}>{formatDate(image.source.lastModified)}</td>
      <td css={tableCellCss}>{() => image.meta.data()?.format ?? 'unknown'}</td>
      <td css={tableCellCss}>
        {() => (image.meta.data()?.hasExifThumbnail ? 'yes' : 'no')}
      </td>
      {exifColumns.map((columnName) => (
        <td css={tableCellCss}>
          {() => image.meta.data()?.exif?.[columnName] ?? ''}
        </td>
      ))}
      <td css={tableCellCss}>
        <button
          on:click={(e: Event) => {
            e.stopPropagation()
            image.favorite.toggle()
          }}
          aria-pressed={isFavorite}
          aria-label={() =>
            isFavorite()
              ? `Remove ${image.name} from favorites`
              : `Add ${image.name} to favorites`
          }
          type="button"
          css={`
            width: 30px;
            height: 30px;
            border-radius: var(--radius-round);
            border: var(--border-width) var(--control-border-style) transparent;
            background: var(--input-bg);
            color: var(--text-secondary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;

            &[aria-pressed='true'] {
              color: var(--accent);
              box-shadow: var(--glow);
            }
            &:hover {
              background: var(--hover-bg);
              color: var(--text-primary);
            }
          `}
        >
          {() => <HeartIcon filled={isFavorite()} />}
        </button>
      </td>
    </tr>
  )
}
