import { computed, isAbort } from '@reatom/core'

import { BreadcrumbNav } from './components/BreadcrumbNav'
import { FilterPanel } from './components/FilterPanel'
import { FolderTree } from './components/FolderTree'
import { GalleryMarkIcon } from './components/Icons'
import { ImageGrid } from './components/ImageGrid'
import { ImageInfoPanel } from './components/ImageInfoPanel'
import { Lightbox } from './components/Lightbox'
import { ProgressBar } from './components/ProgressBar'
import { SettingsPanel } from './components/SettingsPanel'
import { SortPanel } from './components/SortPanel'
import { Toolbar } from './components/Toolbar'
import {
  folderTree,
  openFolder,
  restoreSelectedFolder,
  selectedFolderHandle,
  themeMode,
  themePack,
} from './model'
import { KeyboardShortcuts } from './shortcuts'
import { activeThemeVariables, GlobalStyles } from './theme'

const EmptyState = () => (
  <div
    css={`
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 32px;
      color: var(--text-secondary);
      position: relative;

      &::before,
      &::after {
        content: '';
        position: absolute;
        width: 280px;
        height: 280px;
        border-radius: var(--radius-round);
        filter: blur(18px);
        opacity: 0.8;
        pointer-events: none;
      }

      &::before {
        right: 14%;
        top: 14%;
        background: radial-gradient(circle, var(--hero-glow-1), transparent 68%);
      }

      &::after {
        left: 14%;
        bottom: 12%;
        background: radial-gradient(circle, var(--hero-glow-2), transparent 68%);
      }
    `}
  >
    <div
      css={`
        width: min(480px, 100%);
        padding: 34px;
        border: var(--border-width) var(--border-style) var(--card-border);
        border-radius: var(--radius-xl);
        background-color: var(--bg-secondary);
        background-image:
          var(--surface-bg-image),
          linear-gradient(135deg, var(--surface-glass), var(--card-bg));
        background-size: var(--surface-bg-size), auto;
        box-shadow: var(--glow), 0 26px 80px var(--shadow);
        backdrop-filter: var(--toolbar-backdrop-filter);
        clip-path: var(--surface-clip-path);
        display: grid;
        justify-items: center;
        gap: 18px;
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.14),
            transparent 38%
          );
          pointer-events: none;
        }
      `}
    >
      <div
        css={`
          width: 86px;
          height: 86px;
          border-radius: var(--radius-lg);
          background:
            radial-gradient(circle at 28% 20%, var(--hero-glow-1), transparent 45%),
            linear-gradient(135deg, var(--accent), var(--accent-hover));
          color: var(--accent-contrast);
          display: grid;
          place-items: center;
          font-size: 38px;
          box-shadow: var(--glow), 0 18px 42px var(--shadow);
          user-select: none;
        `}
      >
        <GalleryMarkIcon />
      </div>
      <h2
        css={`
          font-size: 28px;
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: var(--text-primary);
          margin: 0;
          text-align: center;
        `}
      >
        Your images, polished fast
      </h2>
      <p
        css={`
          font-size: 15px;
          margin: 0;
          text-align: center;
          max-width: 390px;
          line-height: 1.65;
          color: var(--text-secondary);
        `}
      >
        Open a folder to browse, filter, favorite, and inspect local images in a
        focused Reatom-powered gallery.
      </p>
      <button
        on:click={() => openFolder()}
        css={`
          padding: 13px 24px;
          font-size: 15px;
          font-weight: 750;
          color: var(--accent-contrast);
          background: linear-gradient(135deg, var(--accent), var(--accent-hover));
          border: var(--border-width) var(--control-border-style) var(--accent);
          border-radius: var(--radius-round);
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 14px 34px var(--shadow);

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 42px var(--shadow-strong);
          }
          &:active {
            transform: translateY(0);
          }
        `}
      >
        Open Folder
      </button>
    </div>
  </div>
)

const RestoreSelectedFolder = () => (
  <div
    style={{ display: 'none' }}
    ref={() => {
      let restoreStarted = false

      return selectedFolderHandle.subscribe((handle) => {
        if (restoreStarted) return
        if (handle === null) return
        if (folderTree() !== null) return

        restoreStarted = true
        restoreSelectedFolder().catch((error: unknown) => {
          if (isAbort(error)) return
          queueMicrotask(() => {
            throw error
          })
        })
      })
    }}
  />
)

export const App = () => {
  const contentMode = computed(() => {
    if (folderTree() === null) {
      if (!openFolder.ready() || !restoreSelectedFolder.ready()) {
        return 'parsing' as const
      }
      return 'empty' as const
    }
    return 'gallery' as const
  }, 'app.contentMode')

  return (
    <div
      attr:data-theme-pack={themePack}
      attr:data-theme-mode={themeMode}
      style={() => activeThemeVariables()}
      css={`
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: var(--bg-primary);
        background-image: var(--app-bg-image);
        background-size: var(--bg-size);
        color: var(--text-primary);
        font-family: var(--font-ui);
        overflow: hidden;
        transition:
          background 0.3s,
          color 0.3s;

        &[data-theme-pack='blueprint'] button,
        &[data-theme-pack='blueprint'] input {
          border-style: dashed;
        }

        &[data-theme-pack='blueprint'][data-theme-mode='light'] main {
          background-color: #eaf8ff;
          background-image:
            linear-gradient(rgba(2,132,168,.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(2,132,168,.12) 1px, transparent 1px);
          background-size: 28px 28px;
        }

        &[data-theme-pack='neon'] button,
        &[data-theme-pack='neon'] input {
          box-shadow: var(--glow);
        }

        &[data-theme-pack='neon'][data-theme-mode='light'] main {
          background-color: #f7f5ff;
          background-image:
            radial-gradient(circle at 15% 20%, rgba(192,38,211,.16), transparent 31%),
            radial-gradient(circle at 90% 8%, rgba(8,145,178,.16), transparent 29%),
            linear-gradient(135deg, rgba(124,58,237,.08), transparent 48%);
        }

        &[data-theme-pack='terminal'] {
          letter-spacing: 0.01em;
        }

        &[data-theme-pack='terminal'][data-theme-mode='light'] main {
          background-color: #f4f6ef;
          background-image:
            linear-gradient(rgba(15,107,58,.055) 50%, transparent 50%),
            linear-gradient(90deg, rgba(15,107,58,.03) 1px, transparent 1px);
          background-size: 100% 4px, 22px 22px;
        }

        &[data-theme-pack='terminal'] button,
        &[data-theme-pack='terminal'] input {
          border-radius: 0;
        }

        &[data-theme-pack='terminal'] button {
          letter-spacing: 0.04em;
          box-shadow: inset 0 0 0 1px var(--input-bg);
        }

        &[data-theme-pack='terminal'] button[data-terminal-bracket='true'] {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.25em;
        }

        &[data-theme-pack='terminal'] button[data-terminal-bracket='true']::before {
          content: '[';
          color: var(--text-muted);
        }

        &[data-theme-pack='terminal'] button[data-terminal-bracket='true']::after {
          content: ']';
          color: var(--text-muted);
        }

        &[data-theme-pack='bauhaus'] button {
          box-shadow: var(--glow);
        }

        &[data-theme-pack='bauhaus'] button:hover {
          box-shadow: var(--card-hover-shadow);
        }

        &[data-theme-pack='bauhaus'] main {
          background-image: var(--app-bg-image);
          background-size: var(--bg-size);
          padding: calc(20px + var(--shadow-clearance, 0px))
            calc(24px + var(--shadow-clearance, 0px));
        }

        &[data-theme-pack='bauhaus'][data-theme-mode='light'] main {
          background-color: #fff1b8;
          background-image: var(--app-bg-image);
        }

        &[data-theme-pack='obsidian'] button,
        &[data-theme-pack='obsidian'] input {
          clip-path: var(--surface-clip-path);
        }

        &[data-theme-pack='obsidian'][data-theme-mode='light'] main {
          background-color: #e7e9ee;
          background-image:
            linear-gradient(135deg, rgba(15,23,42,.12), transparent 26%),
            linear-gradient(315deg, rgba(71,85,105,.12), transparent 24%);
        }

        &[data-theme-pack='paper'][data-theme-mode='light'] main {
          background-color: #f5ecd9;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(42,33,23,.055) 0 1px, transparent 1px),
            linear-gradient(90deg, rgba(42,33,23,.025), transparent 40%, rgba(42,33,23,.025));
          background-size: 22px 22px, auto;
        }

        &[data-theme-pack='aurora'][data-theme-mode='light'] main {
          background-color: #effefa;
          background-image:
            radial-gradient(circle at 18% 20%, rgba(15,159,142,.18), transparent 34%),
            radial-gradient(circle at 82% 8%, rgba(124,58,237,.14), transparent 30%);
        }

        &[data-theme-pack='polaroid'][data-theme-mode='light'] main {
          background-color: #eadfcf;
          background-image: radial-gradient(circle at 50% 10%, rgba(255,255,255,.44), transparent 34%);
        }

        &[data-theme-pack='blueprint'][data-theme-mode='light'] {
          background-color: #eaf8ff;
          background-image:
            linear-gradient(rgba(2,132,168,.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(2,132,168,.12) 1px, transparent 1px);
          background-size: 28px 28px;
          font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
        }

        &[data-theme-pack='neon'][data-theme-mode='light'] {
          background-color: #f7f5ff;
          background-image:
            radial-gradient(circle at 15% 20%, rgba(192,38,211,.16), transparent 31%),
            radial-gradient(circle at 90% 8%, rgba(8,145,178,.16), transparent 29%),
            linear-gradient(135deg, rgba(124,58,237,.08), transparent 48%);
          font-family: 'Inter', system-ui, sans-serif;
        }

        &[data-theme-pack='paper'][data-theme-mode='light'] {
          background-color: #f5ecd9;
          background-image:
            radial-gradient(circle at 20% 30%, rgba(42,33,23,.055) 0 1px, transparent 1px),
            linear-gradient(90deg, rgba(42,33,23,.025), transparent 40%, rgba(42,33,23,.025));
          background-size: 22px 22px, auto;
          font-family: Georgia, 'Times New Roman', serif;
        }

        &[data-theme-pack='bauhaus'][data-theme-mode='light'] {
          background-color: #fff1b8;
          background-image: var(--app-bg-image);
          font-family: Arial, Helvetica, sans-serif;
        }

        &[data-theme-pack='aurora'][data-theme-mode='light'] {
          background-color: #effefa;
          background-image:
            radial-gradient(circle at 18% 20%, rgba(15,159,142,.18), transparent 34%),
            radial-gradient(circle at 82% 8%, rgba(124,58,237,.14), transparent 30%);
        }

        &[data-theme-pack='polaroid'][data-theme-mode='light'] {
          background-color: #eadfcf;
          background-image: radial-gradient(circle at 50% 10%, rgba(255,255,255,.44), transparent 34%);
        }
      `}
    >
      <GlobalStyles />
      <RestoreSelectedFolder />
      <KeyboardShortcuts />

      <style>
        {`
          body {
            margin: 0;
            background-color: var(--bg-primary);
            background-image: var(--app-bg-image);
            background-size: var(--bg-size);
            font-family: var(--font-ui);
          }
          *, *::before, *::after { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: var(--radius-round);
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

        <div css="flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden;">
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
                    border-bottom: var(--border-width) var(--border-style) var(--card-border);
                    background-color: var(--surface-glass);
                    background-image: var(--surface-bg-image);
                    background-size: var(--surface-bg-size);
                    backdrop-filter: var(--toolbar-backdrop-filter);
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
              overflow-x: hidden;
              min-width: 0;
              padding: 20px 24px;
              background-color: var(--bg-primary);
              background-image:
                radial-gradient(circle at top right, var(--hero-glow-2), transparent 34%),
                var(--app-bg-image);
              background-size: auto, var(--bg-size);
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
