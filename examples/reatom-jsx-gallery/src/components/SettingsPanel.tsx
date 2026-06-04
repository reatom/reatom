import { atom } from '@reatom/core'

import {
  gridColumns,
  gridGap,
  ignoreExifOrientation,
  imageFit,
  keepLightboxView,
  showFileSizes,
  showImageNames,
  showLightboxScrubber,
  themeMode,
  themePack,
  wrapFolderNavigation,
} from '../model'
import { THEME_PACKS } from '../theme'
import type { GridGap, ImageFit, ThemeMode, ThemePack } from '../types'
import { CloseIcon } from './Icons'
import { settingsPanelOpen } from './panelState'

const GAP_OPTIONS: GridGap[] = ['none', 'small', 'medium', 'large', 'xl']
const FIT_OPTIONS: ImageFit[] = ['contain', 'cover', 'fill', 'none']

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
    type="button"
    on:click={onClick}
    attr:data-active={isActive}
    aria-pressed={isActive}
    data-terminal-bracket="true"
    css={`
      padding: 6px 12px;
      border: var(--border-width) var(--control-border-style) var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-secondary);
      background-image: var(--surface-bg-image);
      background-size: var(--surface-bg-size);
      color: var(--text-primary);
      font-size: 12px;
      transition: all 0.15s;
      white-space: nowrap;
      text-transform: var(--control-transform);

      &:hover {
        border-color: var(--accent);
        color: var(--accent);
      }

      &[data-active='true'] {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--accent-contrast);
      }
    `}
  >
    {label}
  </button>
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
        --toggle-width: 40px;
        --toggle-height: 22px;
        --toggle-knob-size: 18px;
        --toggle-inset: max(
          1px,
          calc(
            (var(--toggle-height) - var(--toggle-knob-size)) /
              2 - var(--border-width)
          )
        );
        width: var(--toggle-width);
        height: var(--toggle-height);
        border-radius: var(--radius-round);
        background: var(--bg-tertiary);
        border: var(--border-width) var(--control-border-style) var(--border);
        position: relative;
        transition: background 0.2s;
        cursor: pointer;

        &::after {
          content: '';
          position: absolute;
          top: 50%;
          left: var(--toggle-inset);
          width: var(--toggle-knob-size);
          height: var(--toggle-knob-size);
          border-radius: var(--radius-round);
          background: var(--accent-contrast);
          box-shadow: 0 2px 6px var(--shadow);
          transform: translateY(-50%);
          transition: transform 0.2s;
        }

        &[data-on='true'] {
          background: var(--accent);
        }

        &[data-on='true']::after {
          transform: translate(
            calc(
              var(--toggle-width) - var(--toggle-knob-size) - var(
                  --toggle-inset
                ) - var(--toggle-inset) - var(--border-width) - var(
                  --border-width
                )
            ),
            -50%
          );
        }
      `}
    />
  </label>
)

const ThemePackButton = ({
  value,
  label,
  description,
  swatches,
}: {
  value: ThemePack
  label: string
  description: string
  swatches: readonly [string, string, string]
}) => (
  <button
    type="button"
    on:click={() => themePack.set(value)}
    attr:data-active={() => themePack() === value}
    aria-pressed={() => themePack() === value}
    css={`
      width: 100%;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
      align-items: center;
      text-align: left;
      padding: 10px;
      border: var(--border-width) var(--control-border-style) var(--border);
      border-radius: var(--radius-md);
      background: var(--input-bg);
      background-image: var(--surface-bg-image);
      background-size: var(--surface-bg-size);
      color: var(--text-primary);
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--accent);
        background: var(--hover-bg);
      }

      &[data-active='true'] {
        border-color: var(--accent);
        background: var(--active-bg);
        box-shadow:
          0 0 0 3px var(--focus-ring),
          var(--glow);
      }
    `}
  >
    <span css="display: flex; gap: 3px;">
      {swatches.map((color) => (
        <span
          style={{ background: color }}
          css={`
            width: 14px;
            height: 32px;
            border-radius: var(--radius-sm);
            border: var(--border-width) var(--border-style) var(--card-border);
          `}
        />
      ))}
    </span>
    <span css="display: grid; gap: 2px;">
      <span css="font-size: 13px; font-weight: 700;">{label}</span>
      <span css="font-size: 11px; color: var(--text-muted);">
        {description}
      </span>
    </span>
  </button>
)

const ThemeModeButton = ({
  mode,
  label,
}: {
  mode: ThemeMode
  label: string
}) => (
  <button
    type="button"
    on:click={() => themeMode.set(mode)}
    attr:aria-pressed={() => themeMode() === mode}
    css={`
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      border: var(--border-width) var(--control-border-style) var(--border);
      border-radius: var(--radius-sm);
      background: var(--input-bg);
      color: var(--text-primary);
      font-size: 12px;
      font-weight: 700;
      transition: all 0.15s ease;
      text-transform: var(--control-transform);

      &::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: var(--radius-round);
        background: var(--text-muted);
      }

      &:hover {
        border-color: var(--accent);
        background: var(--hover-bg);
      }

      &[aria-pressed='true'] {
        border-color: var(--accent);
        background: var(--accent);
        color: var(--accent-contrast);
        box-shadow:
          var(--glow),
          0 8px 20px var(--shadow);
      }

      &[aria-pressed='true']::before {
        background: currentColor;
      }
    `}
  >
    {label}
  </button>
)

export const SettingsPanel = () => {
  const columnsValue = atom(
    () => (gridColumns() === 0 ? 'auto' : String(gridColumns())),
    'settingsPanel.columnsDisplay',
  )

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      aria-hidden={() => !settingsPanelOpen()}
      prop:inert={() => !settingsPanelOpen()}
      attr:data-open={settingsPanelOpen}
      css={`
        position: fixed;
        top: 0;
        right: 0;
        width: 320px;
        height: 100vh;
        background: var(--bg-secondary);
        border-left: var(--border-width) var(--border-style) var(--border);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow-y: auto;
        padding: 20px calc(20px + var(--shadow-clearance, 0px))
          calc(20px + var(--shadow-clearance, 0px)) 20px;
        box-shadow: -18px 0 48px var(--shadow-strong);
        background-color: var(--panel-bg);
        background-image: var(--surface-bg-image);
        background-size: var(--surface-bg-size);
        backdrop-filter: var(--panel-backdrop-filter);
        clip-path: var(--surface-clip-path);

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
          type="button"
          on:click={() => settingsPanelOpen.set(false)}
          aria-label="Close settings"
          css={`
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

            &:hover {
              background: var(--accent);
              color: var(--accent-contrast);
            }
          `}
        >
          <CloseIcon />
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
          aria-label="Grid columns"
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
          gap: calc(6px + var(--shadow-clearance, 0px));
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

      <SectionTitle text="Image Fit" />
      <div
        css={`
          display: flex;
          flex-wrap: wrap;
          gap: calc(6px + var(--shadow-clearance, 0px));
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
      <ToggleSwitch
        label="Ignore EXIF Orientation"
        checked={() => ignoreExifOrientation()}
        onToggle={ignoreExifOrientation.toggle}
      />

      <SectionTitle text="Lightbox Navigation" />
      <ToggleSwitch
        label="Wrap at Folder Ends"
        checked={() => wrapFolderNavigation()}
        onToggle={wrapFolderNavigation.toggle}
      />
      <ToggleSwitch
        label="Keep Zoom While Navigating"
        checked={() => keepLightboxView()}
        onToggle={keepLightboxView.toggle}
      />
      <ToggleSwitch
        label="Show Folder Scrubber"
        checked={() => showLightboxScrubber()}
        onToggle={showLightboxScrubber.toggle}
      />

      <SectionTitle text="Theme" />
      <div css="display: grid; gap: calc(8px + var(--shadow-clearance, 0px));">
        {THEME_PACKS.map((pack) => (
          <ThemePackButton
            value={pack.value}
            label={pack.label}
            description={pack.description}
            swatches={pack.swatches}
          />
        ))}
      </div>

      <div
        css={`
          display: flex;
          gap: calc(6px + var(--shadow-clearance, 0px));
          margin-top: calc(10px + var(--shadow-clearance, 0px));
        `}
      >
        <ThemeModeButton mode="light" label="Light" />
        <ThemeModeButton mode="dark" label="Dark" />
        <ThemeModeButton mode="system" label="System" />
      </div>
    </aside>
  )
}
