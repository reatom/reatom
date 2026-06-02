import {
  clearSelection,
  folderTree,
  openFolder,
  searchQuery,
  selectAllImages,
  selectedCount,
  theme,
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
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid var(--input-border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      background: ${variant === 'accent' ? 'var(--accent)' : 'var(--input-bg)'};
      color: ${variant === 'accent' ? 'white' : 'var(--text-primary)'};

      &:hover {
        background: ${variant === 'accent'
          ? 'var(--accent-hover)'
          : 'var(--hover-bg)'};
        border-color: ${variant === 'accent'
          ? 'var(--accent-hover)'
          : 'var(--text-muted)'};
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
        border: 1px solid transparent;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
        background: transparent;
        color: var(--text-secondary);

        &[aria-selected='true'] {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
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
      padding: 10px 16px;
      background: var(--toolbar-bg);
      border-bottom: 1px solid var(--card-border);
      backdrop-filter: blur(12px);
      flex-shrink: 0;
      min-height: 52px;
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
          color: var(--accent);
          letter-spacing: -0.3px;
          user-select: none;
        `}
      >
        🖼️ Gallery
      </span>

      <ToolbarButton
        label="📂 Open"
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
            📁 {tree.name}
          </span>
        )
      }}
    </div>

    <div
      css={`
        width: 1px;
        height: 24px;
        background: var(--card-border);
        flex-shrink: 0;
      `}
    />

    <div css="display: flex; gap: 2px; flex-shrink: 0;">
      <ViewModeButton mode="grid" icon="⊞" onClick={() => viewMode.setGrid()} />
      <ViewModeButton mode="list" icon="☰" onClick={() => viewMode.setList()} />
      <ViewModeButton mode="lightbox" icon="⊡" onClick={() => viewMode.setLightbox()} />
      <ViewModeButton mode="slideshow" icon="▶" onClick={() => viewMode.setSlideshow()} />
    </div>

    <div
      css={`
        width: 1px;
        height: 24px;
        background: var(--card-border);
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
            width: 180px;
            padding: 6px 10px 6px 32px;
            font-size: 13px;
            background: var(--input-bg);
            border: 1px solid var(--input-border);
            border-radius: 8px;
            color: var(--text-primary);
            outline: none;
            transition: all 0.15s ease;

            &::placeholder {
              color: var(--text-muted);
            }
            &:focus {
              border-color: var(--accent);
              box-shadow: 0 0 0 2px rgba(233, 69, 96, 0.15);
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
        background: var(--card-border);
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
          border: 1px solid transparent;
          border-radius: 6px;
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
                color: white;
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
          border: 1px solid transparent;
          border-radius: 6px;
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
          theme() === 'dark' ? theme.setLight() : theme.setDark()
        }
        title="Toggle theme"
        css={`
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.15s ease;

          &:hover {
            background: var(--hover-bg);
            color: var(--text-primary);
          }
        `}
      >
        {() => (theme() === 'dark' ? '☀️' : '🌙')}
      </button>
    </div>
  </header>
)
