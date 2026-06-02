import { computed, reatomBoolean } from '@reatom/core'

import type { ImageModel } from '../model'
import { imagesList, lightboxImage, lightboxOpen } from '../model'

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
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  gap: 12px;
`

const labelCss = `
  color: #888;
  font-size: 12px;
  flex-shrink: 0;
  min-width: 70px;
`

const valueCss = `
  color: #ddd;
  font-size: 13px;
  text-align: right;
  word-break: break-all;
  min-width: 0;
`

export const ImageInfoPanel = () => {
  const panelOpen = reatomBoolean(false, 'imageInfoPanel.open')

  const displayImage = computed((): ImageModel | undefined => {
    if (lightboxOpen()) return lightboxImage()
    const firstSelected = imagesList.array().find((m) => m.selected())
    return firstSelected
  }, 'imageInfoPanel.displayImage')

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

  return (
    <div css="position: fixed; right: 0; top: 0; bottom: 0; z-index: 1050; pointer-events: none;">
      <button
        on:click={panelOpen.toggle}
        css={`
          position: absolute;
          right: 16px;
          top: 64px;
          z-index: 1;
          pointer-events: auto;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: #eee;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition:
            background 0.2s,
            right 0.3s ease;
        `}
        style:right={() => (panelOpen() ? '316px' : '16px')}
      >
        ℹ
      </button>

      <div
        data-open={panelOpen}
        css={`
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 300px;
          background: rgba(18, 18, 24, 0.95);
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          padding: 20px 16px;
          overflow-y: auto;
          pointer-events: auto;
          transform: translateX(100%);
          transition: transform 0.3s ease;
          &[data-open='true'] {
            transform: translateX(0);
          }
        `}
      >
        <div css="font-size: 15px; font-weight: 600; color: #eee; margin-bottom: 16px;">
          Image Info
        </div>

        {() => {
          const img = displayImage()
          if (!img)
            return (
              <div css="color: #666; font-size: 13px;">No image selected</div>
            )

          return (
            <div>
              <InfoRow
                label="Filename"
                value={() => displayImage()?.name ?? ''}
              />
              <InfoRow label="Path" value={() => displayImage()?.path ?? ''} />
              <InfoRow
                label="Size"
                value={() => formatBytes(displayImage()?.size ?? 0)}
              />
              <InfoRow
                label="Dimensions"
                value={() => {
                  const i = displayImage()
                  if (!i) return ''
                  const w = i.width()
                  const h = i.height()
                  return w && h ? `${w} × ${h}` : ''
                }}
              />
              <InfoRow label="Type" value={() => displayImage()?.type ?? ''} />
              <InfoRow
                label="Modified"
                value={() => formatDate(displayImage()?.lastModified ?? 0)}
              />
            </div>
          )
        }}
      </div>
    </div>
  )
}
