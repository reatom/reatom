import { keyboardActivate } from '../a11y'
import { IconButton } from '../design-system'
import { registerGlassSurface } from '../glassSurfaces'
import {
  currentFolder,
  folderTree,
  folderTreeIsAllSelected,
  folderTreeSidebarVisible,
  reatomFolderTreeNodeUi,
} from '../model'
import { themeCss } from '../themeCss'
import type { FolderNode } from '../types'
import { BauhausSidebarPrint } from './BauhausArtwork'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderRootIcon,
} from './Icons'

const folderTreeRootCss = `
  display: flex;
  height: 100%;
  position: relative;
`

const folderSidebarCss = `
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width, 240px);
  min-width: var(--sidebar-width, 240px);
  background-color: var(--panel-bg);
  background-image: var(--surface-bg-image);
  background-size: var(--surface-bg-size);
  border-right: var(--border-width) var(--border-style) var(--border);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
  transition:
    margin-left 0.3s ease,
    opacity 0.3s ease;
  margin-left: calc(-1 * var(--sidebar-width, 240px));
  opacity: 0;
  box-shadow: 12px 0 32px var(--shadow);
  backdrop-filter: var(--panel-backdrop-filter);
  clip-path: var(--surface-clip-path);
  &[data-open='true'] {
    margin-left: 0;
    opacity: 1;
  }
`

const folderToggleCss = `
  position: absolute;
  top: calc((var(--folder-header-rail-height, 40px) - var(--folder-toggle-size, 34px)) / 2);
  left: calc(var(--folder-toggle-size, 34px) / 2);
  z-index: 10;
  width: var(--folder-toggle-size, 34px);
  height: var(--folder-toggle-size, 34px);
  transform: translateX(-50%);
  isolation: isolate;
  &[data-ui='button'][data-ui-role][data-ui-surface] {
    --_bg: var(--bg-elevated);
    --_hover-bg: var(--bg-tertiary);
    --_press-bg: var(--bg-tertiary);
    --_border: var(--border-strong);
    --_shadow: none;
    --_image: none;
  }
  &[aria-expanded='true'] {
    left: var(--sidebar-width, 240px);
  }
`

const treeNodeCss = `
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background 0.15s;
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }
`

const expandBtnCss = `
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s;
`

const FolderTreeNode = ({
  node,
  depth,
}: {
  node: FolderNode
  depth: number
}) => {
  const { expanded, isSelected } = reatomFolderTreeNodeUi(node.path, depth < 2)
  const hasChildren = node.children.length > 0

  return (
    <div
      role="group"
      aria-label={node.name}
      css={`
        padding-left: ${depth * 12}px;
        ${themeCss(
          'polaroid',
          `
            padding-left: 0;
            display: flow-root;
            & & {
              margin-left: 3px;
            }
          `,
        )}
      `}
    >
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? expanded : undefined}
        tabindex={0}
        on:click={() => currentFolder.set(node)}
        {...keyboardActivate(() => currentFolder.set(node))}
        data-selected={isSelected}
        css={`
          ${treeNodeCss}
          &:focus-visible {
            outline: 3px solid var(--focus-ring);
            outline-offset: 2px;
          }
          &[data-selected='true'] {
            background: var(--active-bg);
            color: var(--accent);
            box-shadow: inset 0 0 0 var(--border-width) var(--card-border);
          }
        `}
      >
        {hasChildren ? (
          <button
            type="button"
            on:click={(event: MouseEvent) => {
              event.stopPropagation()
              expanded.toggle()
            }}
            aria-label={() =>
              expanded() ? `Collapse ${node.name}` : `Expand ${node.name}`
            }
            data-expanded={expanded}
            css={`
              ${expandBtnCss}
              &[data-expanded='true'] {
                transform: rotate(90deg);
              }
            `}
          >
            <ChevronRightIcon />
          </button>
        ) : (
          <span css="width: 16px; flex-shrink: 0;" />
        )}
        <span css="flex-shrink: 0; font-size: 15px;">
          <FolderIcon />
        </span>
        <span
          css={`
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
            min-width: 0;
          `}
        >
          {node.name}
        </span>
        <span css="color: var(--text-muted); font-size: 11px; flex-shrink: 0;">
          {node.imageCount}
        </span>
      </div>

      {hasChildren
        ? () =>
            expanded() ? (
              <div>
                {node.children.map((child) => (
                  <FolderTreeNode node={child} depth={depth + 1} />
                ))}
              </div>
            ) : null
        : null}
    </div>
  )
}

export const FolderTree = () => (
  <div css={folderTreeRootCss}>
    <div
      id="gallery-folder-sidebar"
      data-open={folderTreeSidebarVisible}
      ref={registerGlassSurface('panel')}
      css={folderSidebarCss}
    >
      <div role="tree" aria-label="Folders">
        <div
          role="treeitem"
          aria-selected={folderTreeIsAllSelected}
          tabindex={0}
          on:click={() => currentFolder.set(null)}
          {...keyboardActivate(() => currentFolder.set(null))}
          data-selected={folderTreeIsAllSelected}
          css={`
            ${treeNodeCss}
            font-weight: 600;
            margin-bottom: 4px;
            &:focus-visible {
              outline: 3px solid var(--focus-ring);
              outline-offset: 2px;
            }
            &[data-selected='true'] {
              background: var(--active-bg);
              color: var(--accent);
              box-shadow: inset 0 0 0 var(--border-width) var(--card-border);
            }
          `}
        >
          <span css="font-size: 15px;">
            <FolderRootIcon />
          </span>
          <span attr:data-folder-name={() => folderTree()?.name ?? 'All folders'}>
            All folders
          </span>
        </div>

        <div css="height: 1px; background: var(--border); margin: 6px 0 10px;" />

        {() => {
          const tree = folderTree()
          if (!tree)
            return (
              <div css="color: var(--text-muted); font-size: 13px; padding: 8px;">
                No folder opened
              </div>
            )
          return <FolderTreeNode node={tree} depth={0} />
        }}
      </div>
      <BauhausSidebarPrint />
    </div>

    <IconButton
      label={() =>
        folderTreeSidebarVisible() ? 'Hide folder tree' : 'Show folder tree'
      }
      expanded={folderTreeSidebarVisible}
      onClick={folderTreeSidebarVisible.toggle}
      css={folderToggleCss}
    >
      {() =>
        folderTreeSidebarVisible() ? <ChevronLeftIcon /> : <ChevronRightIcon />
      }
    </IconButton>
  </div>
)
