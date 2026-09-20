import {
  imageInfoPanelExpanded,
  inspectedImage,
  inspectionCameraHudRows,
  inspectionContextLabel,
  inspectionExifRows,
} from '../model'
import { Panel } from './Panel'
import { imageInfoPanelOpen } from './panelState'

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

export const ImageInfoPanel = () => (
  <Panel
    label="Image details"
    closeLabel="Close details"
    open={imageInfoPanelExpanded}
    onClose={() => imageInfoPanelOpen.set(false)}
    width="300px"
    closeCss="position: sticky; top: 12px; z-index: 1;"
    heading={
      <div>
        <div css="font-size: 15px; font-weight: 750; color: var(--text-primary);">
          Image Details
        </div>
        <div css="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
          {inspectionContextLabel}
        </div>
      </div>
    }
    css={`
      z-index: 1050;
      padding: 20px 16px;
    `}
  >
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
        value={() => inspectedImage()?.display.sizeLabel() ?? ''}
      />
      <InfoRow
        label="Dimensions"
        value={() => inspectedImage()?.display.dimensionsLabel() ?? ''}
      />
      <InfoRow
        label="Type"
        value={() => inspectedImage()?.display.typeLabel() ?? ''}
      />
      <InfoRow
        label="Modified"
        value={() => inspectedImage()?.display.lastModifiedLabel() ?? ''}
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
          if (!meta) return image.meta.pending() ? 'Loading…' : 'Unavailable'

          return meta.hasExifThumbnail ? 'Yes' : 'No'
        }}
      />

      <div
        style:display={() =>
          inspectionCameraHudRows().length > 0 ? 'block' : 'none'
        }
      >
        <div css="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.04em;">
          Camera
        </div>
        {() =>
          inspectionCameraHudRows().map((row) => (
            <CameraRow label={row.label} value={row.value} href={row.href} />
          ))
        }
      </div>

      <div
        style:display={() =>
          inspectionExifRows().length > 0 ? 'block' : 'none'
        }
      >
        <div css="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.04em;">
          EXIF
        </div>
        {() =>
          inspectionExifRows().map(([label, value]) => (
            <InfoRow label={label} value={() => value} />
          ))
        }
      </div>
    </div>
  </Panel>
)

const InfoRow = ({ label, value }: { label: string; value: () => string }) => (
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
