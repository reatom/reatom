import { computed } from '@reatom/core'

import { BreadcrumbNav } from './components/BreadcrumbNav'
import { FilterPanel } from './components/FilterPanel'
import { FolderTree } from './components/FolderTree'
import { ImageGrid } from './components/ImageGrid'
import { ImageInfoPanel } from './components/ImageInfoPanel'
import { Lightbox } from './components/Lightbox'
import { ProgressBar } from './components/ProgressBar'
import { SettingsPanel } from './components/SettingsPanel'
import { SortPanel } from './components/SortPanel'
import { Toolbar } from './components/Toolbar'
import { folderTree, openFolder, theme } from './model'
import { KeyboardShortcuts } from './shortcuts'
import { GlobalStyles } from './theme'

const EmptyState = () => (
  <div
    css={`
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 24px;
      color: var(--text-secondary);
    `}
  >
    <div css="font-size: 72px; filter: grayscale(0.3); user-select: none;">
      🖼️
    </div>
    <h2
      css={`
        font-size: 24px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
      `}
    >
      Gallery Viewer
    </h2>
    <p
      css={`
        font-size: 15px;
        margin: 0;
        text-align: center;
        max-width: 420px;
        line-height: 1.6;
      `}
    >
      Open a folder to browse your images. Supports JPEG, PNG, GIF, WebP, SVG,
      and more.
    </p>
    <button
      on:click={() => openFolder()}
      css={`
        padding: 14px 32px;
        font-size: 16px;
        font-weight: 600;
        color: white;
        background: var(--accent);
        border: none;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(233, 69, 96, 0.3);
        }
        &:active {
          transform: translateY(0);
        }
      `}
    >
      📂 Open Folder
    </button>
  </div>
)

export const App = () => {
  const contentMode = computed(() => {
    if (folderTree() === null) {
      if (!openFolder.ready()) return 'parsing' as const
      return 'empty' as const
    }
    return 'gallery' as const
  }, 'app.contentMode')

  return (
    <div
      attr:data-theme={theme}
      css={`
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: var(--bg-primary);
        color: var(--text-primary);
        font-family:
          'Inter',
          -apple-system,
          BlinkMacSystemFont,
          'Segoe UI',
          sans-serif;
        overflow: hidden;
        transition:
          background 0.3s,
          color 0.3s;

        &[data-theme='dark'] {
          --bg-primary: #1a1a2e;
          --bg-secondary: #16213e;
          --bg-tertiary: #0f3460;
          --accent: #e94560;
          --accent-hover: #ff6b81;
          --text-primary: #eeeeee;
          --text-secondary: #a0a0b0;
          --text-muted: #666680;
          --card-bg: rgba(255, 255, 255, 0.05);
          --card-border: rgba(255, 255, 255, 0.08);
          --border: rgba(255, 255, 255, 0.1);
          --toolbar-bg: rgba(22, 33, 62, 0.95);
          --input-bg: rgba(255, 255, 255, 0.08);
          --input-border: rgba(255, 255, 255, 0.12);
          --hover-bg: rgba(255, 255, 255, 0.1);
          --scrollbar-thumb: rgba(255, 255, 255, 0.15);
          --shadow: rgba(0, 0, 0, 0.3);
        }

        &[data-theme='light'] {
          --bg-primary: #f0f2f5;
          --bg-secondary: #ffffff;
          --bg-tertiary: #e4e6eb;
          --accent: #e94560;
          --accent-hover: #d63851;
          --text-primary: #1a1a2e;
          --text-secondary: #555570;
          --text-muted: #888898;
          --card-bg: #ffffff;
          --card-border: rgba(0, 0, 0, 0.08);
          --border: rgba(0, 0, 0, 0.1);
          --toolbar-bg: rgba(255, 255, 255, 0.95);
          --input-bg: rgba(0, 0, 0, 0.04);
          --input-border: rgba(0, 0, 0, 0.1);
          --hover-bg: rgba(0, 0, 0, 0.05);
          --scrollbar-thumb: rgba(0, 0, 0, 0.15);
          --shadow: rgba(0, 0, 0, 0.08);
        }
      `}
    >
      <GlobalStyles />
      <KeyboardShortcuts />

      <style>
        {`
          body { margin: 0; background: #1a1a2e; }
          *, *::before, *::after { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb, rgba(255,255,255,0.15));
            border-radius: 4px;
          }
          @keyframes lightbox-enter {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}
      </style>

      <Toolbar />

      <div css="flex: 1; overflow: hidden; display: flex;">
        {() => (contentMode() !== 'empty' ? <FolderTree /> : null)}

        <div css="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
          {() => {
            const mode = contentMode()
            if (mode !== 'empty') {
              return (
                <div
                  css={`
                    padding: 4px 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    border-bottom: 1px solid var(--card-border);
                    background: var(--bg-secondary);
                    flex-shrink: 0;
                  `}
                >
                  <BreadcrumbNav />
                  <div css="flex: 1;" />
                  <SortPanel />
                </div>
              )
            }
            return null
          }}

          <main
            css={`
              flex: 1;
              overflow-y: auto;
              padding: 20px 24px;
            `}
          >
            {() => {
              const mode = contentMode()
              if (mode === 'empty') return <EmptyState />
              if (mode === 'parsing') return <ProgressBar />
              return <ImageGrid />
            }}
          </main>
        </div>
      </div>

      <Lightbox />
      <SettingsPanel />
      <FilterPanel />
      <ImageInfoPanel />
    </div>
  )
}
