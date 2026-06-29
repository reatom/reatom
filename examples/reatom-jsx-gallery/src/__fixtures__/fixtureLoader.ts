import type { FolderNode, ImageFile } from '../types'

import {
  fixturePathBasename,
  fixturePathDirname,
  listFixtures,
  mimeFromFilename,
  type FixtureManifestEntry,
  type FixtureTier,
} from './fixtureManifest'

export type { FixtureManifestEntry, FixtureTier } from './fixtureManifest'
export { listFixtures, mimeFromFilename } from './fixtureManifest'

const fixtureAssetUrls = import.meta.glob('./images/**/*', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

function fixtureAssetUrl(tier: FixtureTier, relativePath: string): string {
  const normalizedPath = relativePath.replace(/\\/g, '/')
  const key = `./images/${tier}/${normalizedPath}`
  const url = fixtureAssetUrls[key]
  if (!url) {
    throw new Error(`Missing fixture asset URL for ${tier}/${normalizedPath}`)
  }
  return url
}

function createMockDirHandle(name: string): FileSystemDirectoryHandle {
  return {
    kind: 'directory',
    name,
    getDirectoryHandle: () => Promise.reject(new Error('Not implemented')),
    getFileHandle: () => Promise.reject(new Error('Not implemented')),
    removeEntry: () => Promise.reject(new Error('Not implemented')),
    resolve: () => Promise.reject(new Error('Not implemented')),
    keys: () => [][Symbol.asyncIterator](),
    values: () => [][Symbol.asyncIterator](),
    entries: () => [][Symbol.asyncIterator](),
    isSameEntry: () => Promise.resolve(false),
  } as FileSystemDirectoryHandle
}

export function createFixtureFileHandle(
  tier: FixtureTier,
  relativePath: string,
): FileSystemFileHandle {
  const name = fixturePathBasename(relativePath)
  const mime = mimeFromFilename(name)
  const assetUrl = fixtureAssetUrl(tier, relativePath)

  return {
    kind: 'file',
    name,
    getFile: async () => {
      const response = await fetch(assetUrl)
      const blob = await response.blob()
      return new File([await blob.arrayBuffer()], name, {
        type: mime,
        lastModified: 1700000000000,
      })
    },
    isSameEntry: () => Promise.resolve(false),
  } as FileSystemFileHandle
}

function createImageFromFixture(
  entry: FixtureManifestEntry,
  folderPath: string,
): ImageFile {
  const name = fixturePathBasename(entry.dest)
  const id = `fixture-${entry.sha256.slice(0, 12)}`

  return {
    id,
    name,
    path: folderPath,
    relativePath: folderPath ? `${folderPath}/${name}` : name,
    size: entry.size,
    type: mimeFromFilename(name),
    lastModified: 1700000000000,
    fileHandle: createFixtureFileHandle(entry.tier, entry.dest),
  }
}

function getOrCreateFolder(
  root: FolderNode,
  folderMap: Map<string, FolderNode>,
  folderPath: string,
): FolderNode {
  if (!folderPath) return root

  const existing = folderMap.get(folderPath)
  if (existing) return existing

  const segments = folderPath.split('/')
  let currentPath = ''
  let parent = root

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment
    const cached = folderMap.get(currentPath)
    if (cached) {
      parent = cached
      continue
    }

    const folder: FolderNode = {
      name: segment,
      path: currentPath,
      handle: createMockDirHandle(segment),
      images: [],
      children: [],
      imageCount: 0,
    }
    parent.children.push(folder)
    folderMap.set(currentPath, folder)
    parent = folder
  }

  return parent
}

export function buildFixtureFolderTree(tier: FixtureTier): FolderNode {
  const root: FolderNode = {
    name: 'Fixtures',
    path: '',
    handle: createMockDirHandle('Fixtures'),
    images: [],
    children: [],
    imageCount: 0,
  }
  const folderMap = new Map<string, FolderNode>([['', root]])

  for (const entry of listFixtures(tier)) {
    const folderPath = fixturePathDirname(entry.dest)
    const normalizedFolderPath =
      folderPath === '.' ? '' : folderPath.replace(/\\/g, '/')
    const folder = getOrCreateFolder(root, folderMap, normalizedFolderPath)
    folder.images.push(createImageFromFixture(entry, normalizedFolderPath))
    folder.imageCount += 1
    root.imageCount += 1
  }

  return root
}
