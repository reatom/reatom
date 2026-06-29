import { readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  fixturePathBasename,
  listFixtures,
  mimeFromFilename,
  type FixtureTier,
} from './fixtureManifest'

export type { FixtureManifestEntry, FixtureTier } from './fixtureManifest'
export { listFixtures, mimeFromFilename } from './fixtureManifest'

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), 'images')

export function fixtureAbsPath(
  tier: FixtureTier,
  relativePath: string,
): string {
  return join(fixturesRoot, tier, relativePath)
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
  return new Blob([bytes], {
    type: mimeFromFilename(fixturePathBasename(relativePath)),
  })
}

export async function tierCAvailable(): Promise<boolean> {
  try {
    const fileStat = await stat(fixtureAbsPath('tier-c', 'raw/IMG_3887.CR2'))
    return fileStat.size > 1000
  } catch {
    return false
  }
}
