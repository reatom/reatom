import {
  clearSelection,
  folderTree,
  openFolder,
  searchQuery,
  selectAllImages,
  selectedCount,
  themeMode,
  viewMode,
  visibleIndexMap,
} from '../model'
import { activeFilterCount, filterPanelOpen } from './FilterPanel'
import { settingsPanelOpen } from './SettingsPanel'

const ToolbarButton = ({
  label,
  onClick,
  variant = 'default',
}: {
  label: string
  onClick: () => void
  variant?: 'default' | 'accent'
}) => (
  <button
    on:click={onClick}
    css={`
      padding: 7px 13px;
      font-size: 13px;
      font-weight: 650;
      border: var(--border-width) var(--control-border-style) var(--input-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      background: ${variant === 'accent' ? 'var(--accent)' : 'var(--input-bg)'};
      background-image: var(--surface-bg-image);
      background-size: var(--surface-bg-size);
      color: ${variant === 'accent'
        ? 'var(--accent-contrast)'
        : 'var(--text-primary)'};
      box-shadow: ${variant === 'accent' ? 'var(--glow)' : 'none'};
      text-transform: var(--control-transform);

      &:hover {
        background: ${variant === 'accent'
          ? 'var(--accent-hover)'
          : 'var(--hover-bg)'};
        border-color: ${variant === 'accent'
          ? 'var(--accent-hover)'
          : 'var(--text-muted)'};
        transform: var(--card-hover-transform);
        box-shadow: ${variant === 'accent' ? 'var(--card-hover-shadow)' : 'none'};
      }
    `}
  >
    {label}
  </button>
)

const ViewModeButton = ({
  mode,
  icon,
  onClick,
}: {
  mode: 'grid' | 'list' | 'lightbox' | 'slideshow'
  icon: string
  onClick: () => void
}) => (
  <button
    aria-selected={() => viewMode() === mode}
    on:click={onClick}
    title={mode}
    css={`
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        border: var(--border-width) var(--control-border-style) transparent;
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all 0.15s ease;
        background: transparent;
        color: var(--text-secondary);

        &[aria-selected='true'] {
          background: var(--accent);
          color: var(--accent-contrast);
          border-color: var(--accent);
          box-shadow: var(--glow);
        }
        &:not([aria-selected='true']):hover {
          background: var(--hover-bg);
          color: var(--text-primary);
        }
      `}
    >
      {icon}
    </button>
  )

export const Toolbar = () => (
  <header
    css={`
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 18px;
      background: var(--toolbar-bg);
      background-image: var(--surface-bg-image);
      background-size: var(--surface-bg-size);
      border-bottom: var(--border-width) var(--border-style) var(--card-border);
      backdrop-filter: var(--toolbar-backdrop-filter);
      box-shadow: var(--glow), 0 12px 32px var(--shadow);
      clip-path: var(--surface-clip-path);
      flex-shrink: 0;
      min-height: 56px;
      z-index: 100;
      overflow-x: auto;
    `}
  >
    <div
      css={`
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      `}
    >
      <span
        css={`
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.3px;
          user-select: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        `}
      >
        <span
          css={`
            width: 28px;
            height: 28px;
            border-radius: var(--radius-md);
            background:
              radial-gradient(circle at 30% 20%, var(--hero-glow-1), transparent 52%),
              linear-gradient(135deg, var(--accent), var(--accent-hover));
            color: var(--accent-contrast);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--glow), 0 10px 24px var(--shadow);
          `}
        >
          ◈
        </span>
        Gallery
      </span>

      <ToolbarButton
        label="Open"
        onClick={() => openFolder()}
        variant="accent"
      />

      {() => {
        const tree = folderTree()
        if (!tree) return <span />
        return (
          <span
            css={`
              font-size: 13px;
              color: var(--text-secondary);
              max-width: 160px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            `}
          >
            {tree.name}
          </span>
        )
      }}
    </div>

    <div
      css={`
        width: 1px;
        height: 24px;
        background: var(--border);
        flex-shrink: 0;
      `}
    />

    <div
      css={`
        display: flex;
        gap: 3px;
        flex-shrink: 0;
        padding: 3px;
        border: var(--border-width) var(--control-border-style) var(--border);
        border-radius: var(--radius-md);
        background: var(--input-bg);
        background-image: var(--surface-bg-image);
        background-size: var(--surface-bg-size);
      `}
    >
      <ViewModeButton mode="grid" icon="⊞" onClick={() => viewMode.setGrid()} />
      <ViewModeButton mode="list" icon="☰" onClick={() => viewMode.setList()} />
      <ViewModeButton mode="lightbox" icon="⊡" onClick={() => viewMode.setLightbox()} />
      <ViewModeButton mode="slideshow" icon="▶" onClick={() => viewMode.setSlideshow()} />
    </div>

    <div
      css={`
        width: 1px;
        height: 24px;
        background: var(--border);
        flex-shrink: 0;
      `}
    />

    <div
      css={`
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      `}
    >
      {() => {
        const count = selectedCount()
        if (count === 0) return <span />
        return (
          <span
            css={`
              font-size: 13px;
            color: var(--accent);
              font-weight: 500;
              white-space: nowrap;
            background: var(--accent-soft);
            border: var(--border-width) var(--control-border-style) var(--card-border);
            border-radius: var(--radius-round);
            padding: 4px 9px;
            `}
          >
            {count} selected
          </span>
        )
      }}
      <ToolbarButton label="All" onClick={() => selectAllImages()} />
      <ToolbarButton label="Clear" onClick={() => clearSelection()} />
    </div>

    <div css="flex: 1;" />

    <div
      css={`
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      `}
    >
      <div css="position: relative; display: flex; align-items: center;">
        <span
          css={`
            position: absolute;
            left: 10px;
            font-size: 13px;
            color: var(--text-muted);
            pointer-events: none;
          `}
        >
          🔍
        </span>
        <input
          type="text"
          placeholder="Search images..."
          model:value={searchQuery}
          css={`
            width: 190px;
            padding: 7px 11px 7px 32px;
            font-size: 13px;
            background: var(--input-bg);
            border: var(--border-width) var(--control-border-style) var(--input-border);
            border-radius: var(--radius-round);
            color: var(--text-primary);
            outline: none;
            transition: all 0.15s ease;

            &::placeholder {
              color: var(--text-muted);
            }
            &:focus {
              border-color: var(--accent);
              box-shadow: 0 0 0 3px var(--focus-ring), var(--glow);
            }
          `}
        />
      </div>

      <span
        css={`
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
        `}
      >
        {() => {
          const count = visibleIndexMap().size
          return count > 0 ? `${count} images` : ''
        }}
      </span>
    </div>

    <div
      css={`
        width: 1px;
        height: 24px;
        background: var(--border);
        flex-shrink: 0;
      `}
    />

    <div css="display: flex; gap: 4px; flex-shrink: 0;">
      <button
        on:click={() => filterPanelOpen.set((s) => !s)}
        title="Filters"
        css={`
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          background: transparent;
          border: var(--border-width) var(--control-border-style) transparent;
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.15s ease;
          position: relative;

          &:hover {
            background: var(--hover-bg);
            color: var(--text-primary);
          }
        `}
      >
        🔻
        {() => {
          const count = activeFilterCount()
          if (count === 0) return null
          return (
            <span
              css={`
                position: absolute;
                top: 2px;
                right: 2px;
                width: 14px;
                height: 14px;
                font-size: 9px;
                background: var(--accent);
                color: var(--accent-contrast);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
              `}
            >
              {count}
            </span>
          )
        }}
      </button>

      <button
        on:click={() => settingsPanelOpen.set((s) => !s)}
        title="Settings"
        css={`
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          background: transparent;
          border: var(--border-width) var(--control-border-style) transparent;
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.15s ease;

          &:hover {
            background: var(--hover-bg);
            color: var(--text-primary);
          }
        `}
      >
        ⚙
      </button>

      <button
        on:click={() =>
          themeMode() === 'dark' ? themeMode.setLight() : themeMode.setDark()
        }
        title="Toggle light/dark"
        css={`
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          background: transparent;
          border: var(--border-width) var(--control-border-style) transparent;
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.15s ease;

          &:hover {
            background: var(--hover-bg);
            color: var(--text-primary);
          }
        `}
      >
        {() => (themeMode() === 'dark' ? '🌙' : '☀️')}
      </button>
    </div>
  </header>
)
