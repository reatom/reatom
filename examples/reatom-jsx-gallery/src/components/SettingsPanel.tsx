import { atom } from '@reatom/core'

import {
  aspectRatio,
  gridColumns,
  gridGap,
  imageFit,
  showFileSizes,
  showImageNames,
  thumbnailSize,
} from '../model'
import type { AspectRatio, GridGap, ImageFit, ThumbnailSize } from '../types'

const settingsPanelOpen = atom(false, 'settingsPanelOpen')
export { settingsPanelOpen }

const GAP_OPTIONS: GridGap[] = ['none', 'small', 'medium', 'large', 'xl']
const SIZE_OPTIONS: ThumbnailSize[] = ['small', 'medium', 'large', 'xl']
const FIT_OPTIONS: ImageFit[] = ['contain', 'cover', 'fill', 'none']
const RATIO_OPTIONS: AspectRatio[] = ['fit', 'fill', 'original', 'square']

const SectionTitle = ({ text }: { text: string }) => (
  <h3
    css={`
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      margin-bottom: 8px;
      margin-top: 16px;
    `}
  >
    {text}
  </h3>
)

const OptionButton = ({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: () => boolean
  onClick: () => void
}) => (
  <button
    on:click={onClick}
    attr:data-active={isActive}
    css={`
      padding: 6px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 12px;
      transition: all 0.15s;
      white-space: nowrap;

      &:hover {
        border-color: var(--accent);
        color: var(--accent);
      }

      &[data-active='true'] {
        background: var(--accent);
        border-color: var(--accent);
        color: #fff;
      }
    `}
  >
    {label}
  </button>
)

const OptionGroup = () => (
  <div
    css={`
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    `}
  />
)

const ToggleSwitch = ({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: () => boolean
  onToggle: () => void
}) => (
  <label
    css={`
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      cursor: pointer;
      font-size: 13px;
      color: var(--text-primary);
    `}
  >
    <span>{label}</span>
    <div
      on:click={onToggle}
      attr:data-on={checked}
      css={`
        width: 40px;
        height: 22px;
        border-radius: 11px;
        background: var(--bg-tertiary);
        position: relative;
        transition: background 0.2s;
        cursor: pointer;

        &::after {
          content: '';
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          top: 2px;
          left: 2px;
          transition: transform 0.2s;
        }

        &[data-on='true'] {
          background: var(--accent);
        }

        &[data-on='true']::after {
          transform: translateX(18px);
        }
      `}
    />
  </label>
)

export const SettingsPanel = () => {
  const columnsValue = atom(
    () => (gridColumns() === 0 ? 'auto' : String(gridColumns())),
    'settingsPanel.columnsDisplay',
  )

  const handleColumnsInput = (
    e: Event & { currentTarget: HTMLInputElement },
  ) => {
    const val = e.currentTarget.value
    gridColumns.set(val === 'auto' ? 0 : Number(val))
  }

  return (
    <div
      attr:data-open={settingsPanelOpen}
      css={`
        position: fixed;
        top: 0;
        right: 0;
        width: 320px;
        height: 100vh;
        background: var(--bg-secondary);
        border-left: 1px solid var(--border);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow-y: auto;
        padding: 20px;
        box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);

        &[data-open='true'] {
          transform: translateX(0);
        }
      `}
    >
      <div
        css={`
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        `}
      >
        <h2
          css={`
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
          `}
        >
          Settings
        </h2>
        <button
          on:click={() => settingsPanelOpen.set(false)}
          css={`
            width: 28px;
            height: 28px;
            border: none;
            border-radius: 6px;
            background: var(--bg-tertiary);
            color: var(--text-primary);
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s;

            &:hover {
              background: var(--accent);
              color: #fff;
            }
          `}
        >
          ✕
        </button>
      </div>

      <SectionTitle text="Grid Columns" />
      <div
        css={`
          display: flex;
          align-items: center;
          gap: 12px;
        `}
      >
        <input
          type="range"
          min="0"
          max="12"
          step="1"
          model:valueAsNumber={gridColumns}
          css={`
            flex: 1;
            accent-color: var(--accent);
          `}
        />
        <span
          css={`
            font-size: 13px;
            color: var(--text-secondary);
            min-width: 32px;
            text-align: center;
          `}
        >
          {columnsValue}
        </span>
      </div>

      <SectionTitle text="Grid Gap" />
      <div
        css={`
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        `}
      >
        {GAP_OPTIONS.map((gap) => (
          <OptionButton
            label={gap}
            isActive={() => gridGap() === gap}
            onClick={() => gridGap.set(gap)}
          />
        ))}
      </div>

      <SectionTitle text="Thumbnail Size" />
      <div
        css={`
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        `}
      >
        {SIZE_OPTIONS.map((size) => (
          <OptionButton
            label={size}
            isActive={() => thumbnailSize() === size}
            onClick={() => thumbnailSize.set(size)}
          />
        ))}
      </div>

      <SectionTitle text="Image Fit" />
      <div
        css={`
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        `}
      >
        {FIT_OPTIONS.map((fit) => (
          <OptionButton
            label={fit}
            isActive={() => imageFit() === fit}
            onClick={() => imageFit.set(fit)}
          />
        ))}
      </div>

      <SectionTitle text="Aspect Ratio" />
      <div
        css={`
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        `}
      >
        {RATIO_OPTIONS.map((ratio) => (
          <OptionButton
            label={ratio}
            isActive={() => aspectRatio() === ratio}
            onClick={() => aspectRatio.set(ratio)}
          />
        ))}
      </div>

      <SectionTitle text="UI Options" />
      <ToggleSwitch
        label="Show Image Names"
        checked={() => showImageNames()}
        onToggle={showImageNames.toggle}
      />
      <ToggleSwitch
        label="Show File Sizes"
        checked={() => showFileSizes()}
        onToggle={showFileSizes.toggle}
      />
    </div>
  )
}
