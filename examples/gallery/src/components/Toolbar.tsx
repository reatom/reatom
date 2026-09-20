import { Button, ChoiceButton, IconButton } from '../design-system'
import { registerGlassSurface } from '../glassSurfaces'
import { isFileSystemAccessSupported } from '../filesystem'
import {
  clearSelection,
  folderTree,
  openFolder,
  resetOpenedFolder,
  searchQuery,
  selectAllImages,
  selectedCount,
  setViewMode,
  viewMode,
  visibleIndexMap,
} from '../model'
import { themeCss } from '../themeCss'
import {
  FilterIcon,
  GalleryMarkIcon,
  GridIcon,
  InstantCameraIcon,
  ListIcon,
  SearchIcon,
  SettingsIcon,
  TableIcon,
} from './Icons'
import { ThemeToggle } from './ThemeToggle'
import {
  activeFilterCount,
  filterPanelOpen,
  settingsPanelOpen,
} from './panelState'

export const Toolbar = () => (
  <header
    id="gallery-toolbar"
    ref={registerGlassSurface('panel')}
    css={`
      display: flex;
      align-items: center;
      gap: calc(12px + var(--shadow-clearance, 0px));
      padding: 10px calc(18px + var(--shadow-clearance, 0px))
        calc(10px + var(--shadow-clearance, 0px)) 18px;
      background: var(--toolbar-bg);
      background-image: var(--surface-bg-image);
      background-size: var(--surface-bg-size);
      border-bottom: var(--border-width) var(--border-style) var(--card-border);
      backdrop-filter: var(--toolbar-backdrop-filter);
      box-shadow:
        var(--glow),
        0 12px 32px var(--shadow);
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
        id="gallery-brand"
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
              radial-gradient(
                circle at 30% 20%,
                var(--hero-glow-1),
                transparent 52%
              ),
              linear-gradient(135deg, var(--accent), var(--accent-hover));
            color: var(--accent-contrast);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-shadow:
              var(--glow),
              0 10px 24px var(--shadow);
          `}
        >
          <span
            css={`
              display: none;
              ${themeCss('polaroid', 'display: inline-flex;')}
            `}
          >
            <InstantCameraIcon />
          </span>
          <span
            css={`
              display: inline-flex;
              ${themeCss('polaroid', 'display: none;')}
            `}
          >
            <GalleryMarkIcon />
          </span>
        </span>
        <span
          css={`
            display: none;
            ${themeCss('polaroid', 'display: inline;')}
          `}
        >
          Instant
        </span>
        <span
          css={`
            display: none;
            ${themeCss('blueprint', 'display: inline;')}
          `}
        >
          Blueprint
        </span>
        <span
          css={`
            display: none;
            ${themeCss('obsidian', 'display: inline;')}
          `}
        >
          Obsidian
        </span>
        <span
          css={`
            display: none;
            ${themeCss('minimal', 'display: inline;')}
          `}
        >
          Minimal
        </span>
        <span
          css={`
            display: inline;
            ${themeCss('polaroid', 'display: none;')}
            ${themeCss('blueprint', 'display: none;')}
            ${themeCss('obsidian', 'display: none;')}
            ${themeCss('minimal', 'display: none;')}
          `}
        >
          Gallery
        </span>
      </span>

      <Button
        label="Open"
        onClick={() => openFolder()}
        disabled={!isFileSystemAccessSupported()}
        bracket
        title={
          isFileSystemAccessSupported()
            ? 'Open a local image folder'
            : 'File System Access is unavailable in this browser'
        }
      />

      {() => {
        if (folderTree() === null) return <span />
        return (
          <Button
            appearance="quiet"
            label="Reset"
            onClick={() => resetOpenedFolder()}
            bracket
            title="Unload the current folder"
          />
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
      role="group"
      aria-label="View mode"
      css={`
        display: flex;
        align-items: center;
        gap: calc(4px + var(--shadow-clearance, 0px));
        flex-shrink: 0;
      `}
    >
      <ChoiceButton
        label="grid view"
        selected={() => viewMode() === 'grid'}
        onClick={() => setViewMode('grid')}
        size="icon"
      >
        <GridIcon />
      </ChoiceButton>
      <ChoiceButton
        label="list view"
        selected={() => viewMode() === 'list'}
        onClick={() => setViewMode('list')}
        size="icon"
      >
        <ListIcon />
      </ChoiceButton>
      <ChoiceButton
        label="table view"
        selected={() => viewMode() === 'table'}
        onClick={() => setViewMode('table')}
        size="icon"
      >
        <TableIcon />
      </ChoiceButton>
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
        gap: calc(8px + var(--shadow-clearance, 0px));
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
              border: var(--border-width) var(--control-border-style)
                var(--card-border);
              border-radius: var(--radius-round);
              padding: 4px 9px;
            `}
          >
            {count} selected
          </span>
        )
      }}
      <Button
        appearance="quiet"
        label="All"
        onClick={() => selectAllImages()}
        bracket
      />
      <Button
        appearance="quiet"
        label="Clear"
        onClick={() => clearSelection()}
        bracket
      />
    </div>

    <div css="flex: 1;" />

    <div
      css={`
        display: flex;
        align-items: center;
        gap: calc(8px + var(--shadow-clearance, 0px));
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
          <SearchIcon />
        </span>
        <input
          type="search"
          placeholder="Search images..."
          aria-label="Search images"
          model:value={searchQuery}
          css={`
            width: 190px;
            padding: 7px 11px 7px 32px;
            font-size: 13px;
            background: var(--input-bg);
            border: var(--border-width) var(--control-border-style)
              var(--input-border);
            border-radius: var(--radius-round);
            color: var(--text-primary);
            outline: none;
            transition: all 0.15s ease;

            &::placeholder {
              color: var(--text-muted);
            }
            &:focus {
              border-color: var(--accent);
              box-shadow:
                0 0 0 3px var(--focus-ring),
                var(--glow);
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

    <div css="display: flex; align-items: center; gap: calc(4px + var(--shadow-clearance, 0px)); flex-shrink: 0;">
      <IconButton
        label={() => {
          const count = activeFilterCount()
          return count > 0 ? `Filters, ${count} active` : 'Filters'
        }}
        title="Filters"
        expanded={filterPanelOpen}
        onClick={() => filterPanelOpen.set((s) => !s)}
        css="position: relative;"
      >
        <FilterIcon />
        {() => {
          const count = activeFilterCount()
          if (count === 0) return null
          return (
            <span
              aria-hidden="true"
              css={`
                position: absolute;
                top: 2px;
                right: 2px;
                width: 14px;
                height: 14px;
                font-size: 9px;
                background: var(--accent);
                color: var(--accent-contrast);
                border-radius: var(--radius-round);
                display: flex;
                align-items: center;
                justify-content: center;
              `}
            >
              {count}
            </span>
          )
        }}
      </IconButton>

      <IconButton
        label="Settings"
        expanded={settingsPanelOpen}
        onClick={() => settingsPanelOpen.set((s) => !s)}
      >
        <SettingsIcon />
      </IconButton>

      <ThemeToggle />
    </div>
  </header>
)
