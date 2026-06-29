import { readFile, stat } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { FolderNode, ImageFile } from '../types'

import manifest from './manifest.json'

export type FixtureTier = 'tier-a' | 'tier-b' | 'tier-c'

export type FixtureManifestEntry = {
  tier: FixtureTier
  dest: string
  url?: string
  pixlsGitPath?: string
  generated?: string
  license: string
  source: string
  sha256: string
  size: number
}

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), 'images')

const manifestEntries = (manifest as { entries: FixtureManifestEntry[] }).entries

export function listFixtures(tier?: FixtureTier): FixtureManifestEntry[] {
  if (!tier) return manifestEntries
  return manifestEntries.filter((entry) => entry.tier === tier)
}

export function fixtureAbsPath(
  tier: FixtureTier,
  relativePath: string,
): string {
  return join(fixturesRoot, tier, relativePath)
}

export function mimeFromFilename(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop()
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'avif':
      return 'image/avif'
    case 'bmp':
      return 'image/bmp'
    case 'svg':
      return 'image/svg+xml'
    case 'dng':
      return 'image/x-adobe-dng'
    case 'cr2':
      return 'image/x-canon-cr2'
    case 'nef':
      return 'image/x-nikon-nef'
    case 'arw':
      return 'image/x-sony-arw'
    case 'orf':
      return 'image/x-olympus-orf'
    case 'tiff':
    case 'tif':
      return 'image/tiff'
    case 'ico':
      return 'image/x-icon'
    default:
      return 'application/octet-stream'
  }
}

export async function readFixtureBytes(
  tier: FixtureTier,
  relativePath: string,
): Promise<Uint8Array> {
  const buffer = await readFile(fixtureAbsPath(tier, relativePath))
  return new Uint8Array(buffer)
}

export async function readFixtureBlob(
  tier: FixtureTier,
  relativePath: string,
): Promise<Blob> {
  const bytes = await readFixtureBytes(tier, relativePath)
  return new Blob([bytes], { type: mimeFromFilename(basename(relativePath)) })
}

export async function tierCAvailable(): Promise<boolean> {
  try {
    const fileStat = await stat(
      fixtureAbsPath('tier-c', 'raw/IMG_3887.CR2'),
    )
    return fileStat.size > 1000
  } catch {
    return false
  }
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
  const name = basename(relativePath)
  const mime = mimeFromFilename(name)

  return {
    kind: 'file',
    name,
    getFile: async () => {
      const bytes = await readFixtureBytes(tier, relativePath)
      return new File([bytes], name, {
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
  const name = basename(entry.dest)
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
    const folderPath = dirname(entry.dest)
    const normalizedFolderPath =
      folderPath === '.' ? '' : folderPath.replace(/\\/g, '/')
    const folder = getOrCreateFolder(root, folderMap, normalizedFolderPath)
    folder.images.push(createImageFromFixture(entry, normalizedFolderPath))
    folder.imageCount += 1
    root.imageCount += 1
  }

  return root
}
