import {
  abortVar,
  action,
  addCallHook,
  atom,
  effect,
  isAbort,
  peek,
  reatomRoute,
  withAbort,
  withAsync,
  withCache,
  withChangeHook,
  wrap,
} from '@reatom/core'

import { scanDirectoryRecursive } from '../filesystem'
import type { FolderNode } from '../types'
import { includeSubfolders } from './filters'
import {
  authorizedFolderHandle,
  currentFolder,
  folderTree,
  preloadedFolderTree,
} from './folder'
import { resetLightboxOnFolderChange } from './lightbox'
import {
  activeGalleryScope,
  galleryRootGeneration,
  reatomGalleryFolderScope,
  type GalleryFolderScope,
} from './galleryScope'

type FolderRouteData = {
  scope: GalleryFolderScope
  root: FileSystemDirectoryHandle | null
  generation: symbol
  key: string
  all: boolean
  path: string
}
export type FolderLocation = { folder?: string; all?: string }

function normalizeLocation(input: FolderLocation): FolderLocation {
  const path = input.folder ?? ''
  // Directory names cannot contain slashes. Never resolve a path outside root.
  const valid = !path
    .split('/')
    .some((part) => part === '.' || part === '..' || part === '')
  return input.all === '1'
    ? { all: '1' }
    : { folder: path && valid ? path : undefined }
}

function shell(handle: FileSystemDirectoryHandle, path: string): FolderNode {
  return {
    name: handle.name,
    path,
    handle,
    images: [],
    children: [],
    imageCount: 0,
    loaded: false,
    childrenLoaded: false,
  }
}

/** Resolve ancestors directly; only list their immediate directory names. */
async function resolveFolder(root: FileSystemDirectoryHandle, path: string) {
  const tree = shell(root, '')
  let selected = tree
  for (const name of path.split('/').filter(Boolean)) {
    const handle = await wrap(selected.handle.getDirectoryHandle(name))
    const childPath = selected.path ? `${selected.path}/${name}` : name
    const iterator = selected.handle.values()
    while (true) {
      const { value: entry, done } = await wrap(iterator.next())
      if (done) break
      if (entry.kind === 'directory') {
        selected.children.push(
          shell(
            entry as FileSystemDirectoryHandle,
            selected.path ? `${selected.path}/${entry.name}` : entry.name,
          ),
        )
      }
    }
    selected.childrenLoaded = true
    let child = selected.children.find((child) => child.path === childPath)
    if (!child) {
      child = shell(handle, childPath)
      selected.children.push(child)
    }
    selected = child
  }
  return { tree, selected }
}

/**
 * Merge directory knowledge, never image files, across independently scoped
 * scans.
 */
function mergeDirectoryMetadata(
  previous: FolderNode,
  incoming: FolderNode,
): FolderNode {
  const children = incoming.children.map((child) => {
    const known = previous.children.find(
      (existing) => existing.path === child.path,
    )
    return known ? mergeDirectoryMetadata(known, child) : child
  })
  if (!incoming.childrenLoaded) {
    const seen = new Set(children.map((child) => child.path))
    children.push(...previous.children.filter((child) => !seen.has(child.path)))
  }
  const ownCount = (node: FolderNode) =>
    Math.max(
      0,
      node.imageCount -
        node.children.reduce((count, child) => count + child.imageCount, 0),
    )
  return {
    ...incoming,
    images: [],
    loaded: incoming.loaded !== false || previous.loaded !== false,
    childrenLoaded: incoming.childrenLoaded || previous.childrenLoaded,
    children,
    imageCount:
      ownCount(incoming.loaded === false ? previous : incoming) +
      children.reduce((count, child) => count + child.imageCount, 0),
  }
}

function replaceBranch(
  tree: FolderNode,
  selectedPath: string,
  branch: FolderNode,
): FolderNode {
  if (tree.path === selectedPath) return mergeDirectoryMetadata(tree, branch)
  const children = tree.children.map((child) =>
    selectedPath === child.path || selectedPath.startsWith(`${child.path}/`)
      ? replaceBranch(child, selectedPath, branch)
      : child,
  )
  return {
    ...tree,
    children,
    imageCount:
      Math.max(
        0,
        tree.imageCount -
          tree.children.reduce((count, child) => count + child.imageCount, 0),
      ) + children.reduce((count, child) => count + child.imageCount, 0),
  }
}

const desiredScope = atom<{ key: string; generation: symbol } | null>(
  null,
  'gallery.desiredScope',
)
function scopeKey(location: FolderLocation, recursive: boolean) {
  return JSON.stringify([
    location.folder ?? '',
    location.all === '1',
    recursive,
  ])
}
function directoryTree(tree: FolderNode): FolderNode {
  return {
    ...tree,
    loaded: tree.loaded !== false,
    childrenLoaded: tree.childrenLoaded ?? tree.loaded !== false,
    images: [],
    children: tree.children.map(directoryTree),
  }
}
function findFolder(tree: FolderNode, path: string): FolderNode | undefined {
  if (tree.path === path) return tree
  for (const child of tree.children) {
    const found = findFolder(child, path)
    if (found) return found
  }
}
const beginScope = action((key: string, generation: symbol) => {
  desiredScope.set({ key, generation })
  const current = activeGalleryScope()
  if (current?.key === key && current.generation === generation) return
  resetLightboxOnFolderChange()
  activeGalleryScope.set(null)
  current?.deactivate()
  currentFolder.set(null)
}, 'gallery.beginScope')
const activateScope = action((scope: GalleryFolderScope) => {
  const desired = desiredScope()
  if (desired?.key === scope.key && desired.generation === scope.generation) {
    scope.activate()
    activeGalleryScope.set(scope)
  }
}, 'gallery.activateScope')

/**
 * Route cache owns completed scopes; the active scope pins a pending/evicted
 * one.
 */
export const galleryRoute = reatomRoute({
  search: {
    decode: (input: FolderLocation): FolderLocation => normalizeLocation(input),
    encode: (location: FolderLocation): FolderLocation =>
      normalizeLocation(location),
  },
  async loader(location): Promise<FolderRouteData | null> {
    discoverFolderChildren.abort()
    const root = authorizedFolderHandle()
    const generation = galleryRootGeneration()
    const recursive = location.all === '1' || includeSubfolders()
    const preloaded = root ? null : preloadedFolderTree()
    const key = scopeKey(location, recursive)
    beginScope(key, generation)
    // withCache evaluates synchronous dependencies speculatively. No scope or
    // filesystem work may begin until a cache hit has cancelled that execution.
    await wrap(Promise.resolve())
    if (!root && !preloaded) return null
    const path = location.folder ?? ''
    let scope = peek(activeGalleryScope)
    if (root || scope?.key !== key || scope.generation !== generation)
      scope = reatomGalleryFolderScope(key, recursive, generation)
    const ownedScope = scope!
    let completed = false
    try {
      const resolved = root
        ? await wrap(resolveFolder(root, path))
        : {
            tree: preloaded!,
            selected: findFolder(preloaded!, path) ?? preloaded!,
          }
      const sidebar = peek(folderTree)
      if (!sidebar || sidebar.handle !== resolved.tree.handle)
        folderTree.set(directoryTree(resolved.tree))
      else
        folderTree.set(
          mergeDirectoryMetadata(sidebar, directoryTree(resolved.tree)),
        )
      activateScope(ownedScope)
      const signal = abortVar.require().signal
      const publish = action(({ tree }: { tree: FolderNode }) => {
        if (signal.aborted || activeGalleryScope() !== ownedScope) return
        ownedScope.source.set(recursive ? tree : { ...tree, children: [] })
        const next = replaceBranch(
          folderTree() ?? directoryTree(resolved.tree),
          path,
          directoryTree(tree),
        )
        folderTree.set(next)
        currentFolder.set(
          location.all === '1' ? null : (findFolder(next, path) ?? next),
        )
      }, 'galleryRoute.publish')
      if (root) {
        const result = await wrap(
          scanDirectoryRecursive(resolved.selected.handle, {
            path,
            rootName: root.name,
            recursive,
            onBatch: publish,
          }),
        )
        publish(result)
      } else publish({ tree: resolved.selected })
      completed = true
      return {
        scope: ownedScope,
        root,
        generation,
        key,
        path,
        all: location.all === '1',
      }
    } catch (error) {
      if (
        !isAbort(error) &&
        error instanceof DOMException &&
        error.name === 'NotFoundError'
      ) {
        galleryRoute.go({}, true)
        return null
      }
      throw error
    } finally {
      if (!completed) {
        if (peek(activeGalleryScope) === ownedScope)
          activeGalleryScope.set(null)
        ownedScope.dispose()
      }
    }
  },
})
export const galleryLoader = galleryRoute.loader.extend(withCache())
function cachedScopes(
  cache: ReturnType<typeof galleryLoader.cacheAtom> | undefined,
) {
  return new Set(
    [...(cache?.values() ?? [])].flatMap((record) =>
      record.value ? [record.value.scope] : [],
    ),
  )
}
function retained(scope: GalleryFolderScope) {
  return (
    activeGalleryScope() === scope ||
    cachedScopes(galleryLoader.cacheAtom()).has(scope)
  )
}
galleryLoader.cacheAtom.extend(
  withChangeHook((next, previous) => {
    const after = cachedScopes(next)
    for (const scope of cachedScopes(previous))
      if (!after.has(scope) && activeGalleryScope() !== scope) scope.dispose()
  }),
)
activeGalleryScope.extend(
  withChangeHook((next, previous) => {
    if (!previous || previous === next) return
    previous.deactivate()
    if (!retained(previous)) previous.dispose()
  }),
)
addCallHook(galleryLoader.onFulfill, ({ payload }) => {
  if (!payload && !authorizedFolderHandle() && !preloadedFolderTree()) {
    for (const record of galleryLoader.cacheAtom().values())
      clearTimeout(record.clearTimeoutId)
    galleryLoader.cacheAtom.clear()
    return
  }
  if (
    !payload ||
    payload.generation !== galleryRootGeneration() ||
    payload.root !== authorizedFolderHandle()
  )
    return
  activateScope(payload.scope)
  const tree = folderTree()
  currentFolder.set(
    payload.all ? null : tree ? (findFolder(tree, payload.path) ?? null) : null,
  )
})
export const clearGalleryRouteCache = action(() => {
  desiredScope.set(null)
  resetLightboxOnFolderChange()
  const previous = activeGalleryScope()
  activeGalleryScope.set(null)
  previous?.deactivate()
  galleryRootGeneration.set(Symbol('gallery root'))
  for (const record of galleryLoader.cacheAtom().values())
    clearTimeout(record.clearTimeoutId)
  galleryLoader.cacheAtom.clear()
}, 'gallery.clearRouteCache')

/**
 * Explicit adapter for synchronous preloaded demos and isolated component
 * tests.
 */
export const installPreloadedGalleryScope = action(
  (tree: FolderNode, selectedPath = '') => {
    const recursive = includeSubfolders()
    const generation = galleryRootGeneration()
    const key = scopeKey({ folder: selectedPath || undefined }, recursive)
    beginScope(key, generation)
    const scope = reatomGalleryFolderScope(key, recursive, generation)
    const selected = findFolder(tree, selectedPath) ?? tree
    scope.source.set(recursive ? selected : { ...selected, children: [] })
    folderTree.set(directoryTree(tree))
    currentFolder.set(findFolder(folderTree()!, selectedPath) ?? folderTree())
    activateScope(scope)
  },
  'gallery.installPreloadedScope',
)

export const selectFolder = action((folder: FolderNode | null) => {
  galleryRoute.go(folder ? { folder: folder.path || undefined } : { all: '1' })
}, 'gallery.selectFolder')

export const bindGalleryRoute = () => {
  const binding = effect(() => galleryRoute.loader.data(), 'gallery.bindRoute')
  return () => binding.unsubscribe()
}

/** Expanding a shell lists directories only, without creating any image models. */
export const discoverFolderChildren = action(async (node: FolderNode) => {
  const root = authorizedFolderHandle()
  if (!root || node.childrenLoaded) return
  const children: FolderNode[] = []
  const iterator = node.handle.values()
  while (true) {
    const { value: entry, done } = await wrap(iterator.next())
    if (done) break
    if (entry.kind === 'directory') {
      children.push(
        shell(
          entry as FileSystemDirectoryHandle,
          node.path ? `${node.path}/${entry.name}` : entry.name,
        ),
      )
    }
  }
  if (authorizedFolderHandle() !== root) return
  function update(tree: FolderNode): FolderNode {
    if (tree.path === node.path)
      return tree === node
        ? {
            ...tree,
            children: children.map(
              (child) =>
                tree.children.find(
                  (existing) => existing.path === child.path,
                ) ?? child,
            ),
            childrenLoaded: true,
          }
        : tree
    const nextChildren = tree.children.map(update)
    return nextChildren.every((child, index) => child === tree.children[index])
      ? tree
      : { ...tree, children: nextChildren }
  }
  const tree = folderTree()
  if (tree) folderTree.set(update(tree))
}, 'gallery.discoverFolderChildren').extend(withAsync(), withAbort('manual'))
