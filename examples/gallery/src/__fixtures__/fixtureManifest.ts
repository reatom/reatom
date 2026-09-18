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

const manifestEntries = (manifest as { entries: FixtureManifestEntry[] })
  .entries

export function listFixtures(tier?: FixtureTier): FixtureManifestEntry[] {
  if (!tier) return manifestEntries
  return manifestEntries.filter((entry) => entry.tier === tier)
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

function pathBasename(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1)
}

export function fixturePathBasename(relativePath: string): string {
  return pathBasename(relativePath)
}

export function fixturePathDirname(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash === -1 ? '.' : normalized.slice(0, lastSlash)
}
