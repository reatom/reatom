import { reatomLinkedList } from '@reatom/core'

import { keyboardActivate } from '../a11y'
import { IconButton } from '../design-system'
import { registerGlassSurface } from '../glassSurfaces'
import { formatImageCount } from '../imageFormat'
import {
  selectFolder,
  discoverFolderChildren,
  folderTree,
  folderTreeIsAllSelected,
  folderTreeSidebarVisible,
  reatomFolderTreeNodeUi,
} from '../model'
import { pack } from '../themeVars'
import type { FolderNode } from '../types'
import { BauhausSidebarPrint } from './BauhausArtwork'
import {
  ChevronRightIcon,
  FolderIcon,
  FolderRootIcon,
  SidebarIcon,
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
    margin-left 180ms ease-out,
    opacity 180ms ease-out;
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
  margin-left: calc(-1 * var(--sidebar-width, 240px));
  opacity: 0;
  box-shadow: 12px 0 32px var(--shadow);
  backdrop-filter: var(--panel-backdrop-filter);
  clip-path: var(--surface-clip-path);
  &[data-open='true'] {
    margin-left: 0;
    opacity: 1;
  }
  ${pack.container('polaroid')} {
      [role='group'] {
        padding-left: 0;
        display: flow-root;
      }
      [role='group'] [role='group'] {
        margin-left: 3px;
      }
    }
`

const folderToggleCss = `
  position: absolute;
  top: calc((var(--folder-header-rail-height, 40px) - var(--folder-toggle-size, 32px)) / 2);
  left: 8px;
  z-index: 10;
  width: var(--folder-toggle-size, 32px);
  height: var(--folder-toggle-size, 32px);
  isolation: isolate;
  &[data-ui='button'][data-ui-role][data-ui-surface] {
    --_bg: var(--folder-toggle-bg, var(--bg-elevated));
    --_hover-bg: var(--bg-tertiary);
    --_press-bg: var(--bg-tertiary);
    --_shadow: none;
    --_image: none;
  }
  &[aria-expanded='true'] {
    left: calc(var(--sidebar-width, 240px) + var(--folder-toggle-inset, 8px));
  }
`

const treeNodeCss = `
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition:
    background-color 180ms ease-out,
    color 180ms ease-out,
    box-shadow 180ms ease-out;
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
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
  transition: transform 180ms ease-out;
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const FolderTreeNode = ({
  node,
  depth,
}: {
  node: FolderNode
  depth: number
}) => {
  const { expanded, isSelected } = reatomFolderTreeNodeUi(
    node.path,
    depth === 0 ||
      (depth < 2 && (node.loaded !== false || node.children.length > 0)),
  )
  const hasChildren = node.children.length > 0 || node.childrenLoaded === false
  const children = reatomLinkedList(
    node.children
      .toSorted((left, right) =>
        left.name.localeCompare(right.name, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      )
      .map((node) => ({ node })),
    `folderTree.${node.path}.children`,
  )

  return (
    <div
      role="group"
      aria-label={node.name}
      css={`
        padding-left: ${depth * 12}px;
      `}
    >
      <div
        role="treeitem"
        aria-label={`${node.name}, ${node.loaded === false ? 'not loaded' : formatImageCount(node.imageCount)}`}
        aria-selected={isSelected}
        aria-expanded={hasChildren ? expanded : undefined}
        tabindex={0}
        on:click={() => selectFolder(node)}
        {...keyboardActivate(() => selectFolder(node))}
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
              if (expanded()) discoverFolderChildren(node)
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
          {node.loaded === false ? '…' : node.imageCount}
        </span>
      </div>

      {hasChildren ? (
        <div
          data-expanded={expanded}
          css={`
            &[data-expanded='false'] {
              display: none;
            }
          `}
        >
          {children.reatomMap(({ node }) => (
            <FolderTreeNode node={node} depth={depth + 1} />
          ))}
        </div>
      ) : null}
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
          on:click={() => selectFolder(null)}
          {...keyboardActivate(() => selectFolder(null))}
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
          <span
            attr:data-folder-name={() => folderTree()?.name ?? 'All folders'}
          >
            All folders
          </span>
        </div>

        <div
          id="gallery-folder-divider"
          css="height: 1px; background: var(--border); margin: 6px 0 10px;"
        />

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
      <SidebarIcon />
    </IconButton>
  </div>
)
