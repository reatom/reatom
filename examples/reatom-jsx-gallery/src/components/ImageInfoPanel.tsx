import { computed, effect } from '@reatom/core'

import { EXIF_TAGS_WITH_CUSTOM_FORMAT } from '../image-engine/formats/exif'
import {
  buildCameraHudRows,
  formatExifDisplayValue,
  isPinnedExifDetailTag,
} from '../image-engine/exifDisplay'
import type { ImageModel } from '../model'
import {
  imagesList,
  lightboxImage,
  lightboxOpen,
  selectedCount,
} from '../model'
import { CloseIcon } from './Icons'
import { imageInfoPanelOpen, settingsPanelOpen } from './panelState'

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(exponent > 0 ? 1 : 0)} ${units[exponent]}`
}

const formatDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const infoRowCss = `
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  gap: 12px;
`

const labelCss = `
  color: var(--text-muted);
  font-size: 12px;
  flex-shrink: 0;
  min-width: 70px;
`

const valueCss = `
  color: var(--text-primary);
  font-size: 13px;
  text-align: right;
  word-break: break-all;
  min-width: 0;
`

const panelHeaderCss = `
  margin-bottom: 16px;
  padding-right: 40px;
`

const panelCloseButtonCss = `
  position: sticky;
  top: 12px;
  z-index: 1;
  margin: 0 0 -28px auto;
  width: 28px;
  height: 28px;
  border: var(--border-width) var(--control-border-style) transparent;
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  cursor: pointer;

  &:hover {
    background: var(--accent);
    color: var(--accent-contrast);
  }
`

export const ImageInfoPanel = () => {
  const resetOpenOnPreviewClose = effect(() => {
    if (!lightboxOpen()) imageInfoPanelOpen.setFalse()
  }, 'imageInfoPanel.resetOpenOnPreviewClose')

  const inspectedImage = computed((): ImageModel | null => {
    if (lightboxOpen()) return lightboxImage()
    const firstSelected = imagesList.array().find((m) => m.selected())
    return firstSelected ?? null
  }, 'imageInfoPanel.inspectedImage')

  const panelExpanded = () =>
    imageInfoPanelOpen() &&
    lightboxOpen() &&
    inspectedImage() !== null &&
    !settingsPanelOpen()

  const panelContext = () => {
    if (lightboxOpen()) return 'Lightbox image'
    const count = selectedCount()
    if (count > 1) return `Showing first of ${count} selected`
    return 'Selected image'
  }

  const cameraHudRows = (): ReturnType<typeof buildCameraHudRows> => {
    const exif = inspectedImage()?.meta.data()?.exif
    return buildCameraHudRows(exif)
  }

  const exifRowsWithoutCustomFormat = (): [string, string][] => {
    const exif = inspectedImage()?.meta.data()?.exif
    if (!exif) return []

    return Object.entries(exif)
      .filter(
        ([name]) =>
          !EXIF_TAGS_WITH_CUSTOM_FORMAT.has(name) &&
          !isPinnedExifDetailTag(name),
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, raw]) => [
        name,
        formatExifDisplayValue(name, raw, exif),
      ])
  }

  const InfoRow = ({
    label,
    value,
  }: {
    label: string
    value: () => string
  }) => (
    <div css={infoRowCss}>
      <span css={labelCss}>{label}</span>
      <span css={valueCss}>{value}</span>
    </div>
  )

  const CameraRow = ({
    label,
    value,
    href,
  }: {
    label: string
    value: string
    href?: string
  }) => (
    <div css={infoRowCss}>
      <span css={labelCss}>{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          css={`
            ${valueCss}
            color: var(--accent);
            text-decoration: none;
            &:hover {
              text-decoration: underline;
            }
          `}
        >
          {value}
        </a>
      ) : (
        <span css={valueCss}>{value}</span>
      )}
    </div>
  )

  return (
    <div
      ref={() => resetOpenOnPreviewClose.unsubscribe}
      css="position: fixed; right: 0; top: 0; bottom: 0; z-index: 1050; pointer-events: none;"
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Image details"
        data-open={panelExpanded}
        aria-hidden={() => !panelExpanded()}
        prop:inert={() => !panelExpanded()}
        css={`
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 300px;
          background-color: var(--panel-bg);
          background-image: var(--surface-bg-image);
          background-size: var(--surface-bg-size);
          border-left: var(--border-width) var(--border-style) var(--border);
          backdrop-filter: var(--panel-backdrop-filter);
          padding: 20px 16px;
          overflow-y: auto;
          pointer-events: auto;
          transform: translateX(100%);
          visibility: hidden;
          transition:
            transform 0.3s ease,
            visibility 0s linear 0.3s;
          box-shadow: -18px 0 48px var(--shadow-strong);
          clip-path: var(--surface-clip-path);
          &[data-open='true'] {
            transform: translateX(0);
            visibility: visible;
            transition: transform 0.3s ease;
          }
        `}
      >
        <button
          type="button"
          on:click={() => imageInfoPanelOpen.set(false)}
          css={panelCloseButtonCss}
          title="Close details"
          aria-label="Close details"
        >
          <CloseIcon />
        </button>

        <div css={panelHeaderCss}>
          <div>
            <div css="font-size: 15px; font-weight: 750; color: var(--text-primary);">
              Image Details
            </div>
            <div css="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              {panelContext}
            </div>
          </div>
        </div>

        <div style:display={() => (inspectedImage() ? 'block' : 'none')}>
          <InfoRow
            label="Filename"
            value={() => inspectedImage()?.source.name ?? ''}
          />
          <InfoRow
            label="Path"
            value={() => {
              const source = inspectedImage()?.source
              return source ? source.relativePath || source.path : ''
            }}
          />
          <InfoRow
            label="Size"
            value={() => {
              const source = inspectedImage()?.source
              return source ? formatBytes(source.size) : ''
            }}
          />
          <InfoRow
            label="Dimensions"
            value={() => {
              const image = inspectedImage()
              if (!image) return ''

              const width = image.width()
              const height = image.height()
              if (width && height) return `${width} × ${height}`

              return image.meta.pending() ? 'Loading…' : 'Unavailable'
            }}
          />
          <InfoRow
            label="Type"
            value={() => inspectedImage()?.source.type || ''}
          />
          <InfoRow
            label="Modified"
            value={() => {
              const source = inspectedImage()?.source
              return source ? formatDate(source.lastModified) : ''
            }}
          />
          <InfoRow
            label="Format"
            value={() => {
              const image = inspectedImage()
              if (!image) return ''

              const imageFormat = image.meta.data()?.format
              if (imageFormat) return imageFormat.toUpperCase()

              return image.meta.pending() ? 'Loading…' : 'Unavailable'
            }}
          />
          <InfoRow
            label="EXIF thumb"
            value={() => {
              const image = inspectedImage()
              if (!image) return ''

              const meta = image.meta.data()
              if (!meta)
                return image.meta.pending() ? 'Loading…' : 'Unavailable'

              return meta.hasExifThumbnail ? 'Yes' : 'No'
            }}
          />

          <div
            style:display={() => (cameraHudRows().length > 0 ? 'block' : 'none')}
          >
            <div css="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.04em;">
              Camera
            </div>
            {() =>
              cameraHudRows().map((row) => (
                <CameraRow
                  label={row.label}
                  value={row.value}
                  href={row.href}
                />
              ))
            }
          </div>

          <div
            style:display={() =>
              exifRowsWithoutCustomFormat().length > 0 ? 'block' : 'none'
            }
          >
            <div css="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.04em;">
              EXIF
            </div>
            {() =>
              exifRowsWithoutCustomFormat().map(([label, value]) => (
                <InfoRow label={label} value={() => value} />
              ))
            }
          </div>
        </div>
      </aside>
    </div>
  )
}
