import { computed, reatomBoolean } from '@reatom/core'

import { currentFolder, folderTree } from '../model'
import type { FolderNode } from '../types'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderRootIcon,
} from './Icons'

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
  const expanded = reatomBoolean(depth < 2, `folderTree.${node.path}.expanded`)
  const hasChildren = node.children.length > 0

  const isSelected = computed(
    () => currentFolder()?.path === node.path,
    `folderTree.${node.path}.isSelected`,
  )

  const handleSelect = () => currentFolder.set(node)

  const handleToggleExpand = (e: MouseEvent) => {
    e.stopPropagation()
    expanded.toggle()
  }

  return (
    <div
      css={`
        padding-left: ${depth * 12}px;
      `}
    >
      <div
        on:click={handleSelect}
        data-selected={isSelected}
        css={`
          ${treeNodeCss}
          &[data-selected='true'] {
            background: var(--active-bg);
            color: var(--accent);
            box-shadow: inset 0 0 0 var(--border-width) var(--card-border);
          }
        `}
      >
        {hasChildren ? (
          <button
            on:click={handleToggleExpand}
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

export const FolderTree = () => {
  const sidebarVisible = reatomBoolean(true, 'folderTree.sidebarVisible')

  const isAllSelected = computed(
    () => currentFolder() === null,
    'folderTree.isAllSelected',
  )

  const handleSelectAll = () => currentFolder.set(null)

  return (
    <div css="display: flex; height: 100%; position: relative;">
      <div
        data-open={sidebarVisible}
        css={`
          width: 240px;
          min-width: 240px;
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
          margin-left: -240px;
          opacity: 0;
          box-shadow: 12px 0 32px var(--shadow);
          backdrop-filter: var(--panel-backdrop-filter);
          clip-path: var(--surface-clip-path);
          &[data-open='true'] {
            margin-left: 0;
            opacity: 1;
          }
        `}
      >
        <div
          on:click={handleSelectAll}
          data-selected={isAllSelected}
          css={`
            ${treeNodeCss}
            font-weight: 600;
            margin-bottom: 4px;
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
          <span>All folders</span>
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

      <button
        on:click={sidebarVisible.toggle}
        css={`
          position: absolute;
          left: 0;
          top: 8px;
          z-index: 10;
          background: var(--surface-strong);
          border: var(--border-width) var(--control-border-style) var(--border);
          border-left: none;
          color: var(--text-secondary);
          padding: 8px 6px;
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          cursor: pointer;
          font-size: 12px;
          transition:
            left 0.3s ease,
            background 0.2s;
          &:hover {
            background: var(--bg-elevated);
            color: var(--text-primary);
          }
        `}
        style:left={() => (sidebarVisible() ? '240px' : '0px')}
      >
        {() => (sidebarVisible() ? <ChevronLeftIcon /> : <ChevronRightIcon />)}
      </button>
    </div>
  )
}
